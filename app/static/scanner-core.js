/**
 * BookOracle Core Scanner Module
 * Main scanner orchestration and state management
 */

// Scanner state management
let scannerState = 'idle'; // 'idle', 'starting', 'scanning', 'stopping'
let scanner = null;
let videoStream = null;
let animationFrameId = null;
let lastScanTime = 0;
let lastDetectedCode = null;
let detectionCount = 0;
let scanAttempts = 0;
let isProcessingScan = false; // Prevent multiple simultaneous scans
let hasNotifiedScan = false; // Prevent duplicate notifications

// Constants
const SCAN_COOLDOWN = 5000; // 5 seconds between scans (increased)
const REQUIRED_DETECTIONS = 1; // Only need 1 detection since we stop immediately
const MAX_SCAN_ATTEMPTS = 10; // Maximum invalid scan attempts

// Environment detection - use global variables set up earlier
let isCapacitor = window.isCapacitor;
let isNative = window.isNative;
let platform = window.platform;

/**
 * Smart Scanner - Main entry point that tries multiple approaches
 */
async function startSmartScanner() {
  if (scannerState !== 'idle') {
    console.log('[ScannerCore] Scanner not idle, current state:', scannerState);
    return;
  }
  
  console.log('[ScannerCore] === STARTING SMART SCANNER ===');
  scannerState = 'starting';
  hasNotifiedScan = false; // Reset notification flag
  
  // Update UI - but don't show viewport yet, we'll show it only if needed
  if (window.ScannerUI) {
    window.ScannerUI.updateScannerButton(true);
    window.ScannerUI.updateScannerStatus('Initializing scanner...', 'info');
  }
  
  // Debug logging
  console.log('[ScannerCore] Starting smart scanner with environment:', {
    isCapacitor: window.isCapacitor,
    isNative: window.isNative,
    platform: window.platform,
    NativeScanner: !!window.NativeScanner,
    ScannerZXing: !!window.ScannerZXing,
    Capacitor: typeof Capacitor,
    CapacitorPlugins: window.isCapacitor ? Object.keys(Capacitor.Plugins || {}) : 'N/A'
  });
  
  try {
    // Try native scanner first if available
    // For hybrid apps, we should try native scanner if Capacitor is available and we're not on web
    const shouldTryNative = window.isCapacitor && 
                           window.platform !== 'web' && 
                           window.NativeScanner && 
                           window.NativeScanner.startNativeScanner;
    
    console.log('[ScannerCore] Native scanner check:', {
      isCapacitor: window.isCapacitor,
      platform: window.platform,
      hasNativeScanner: !!window.NativeScanner,
      hasStartNativeScanner: !!(window.NativeScanner && window.NativeScanner.startNativeScanner),
      shouldTryNative: shouldTryNative
    });
    
    if (shouldTryNative) {
      console.log('[ScannerCore] === ATTEMPTING NATIVE SCANNER ===');
      if (window.ScannerUI) {
        window.ScannerUI.updateScannerStatus('Starting native scanner...', 'info');
      }
      
      try {
        console.log('[ScannerCore] Calling NativeScanner.startNativeScanner()...');
        await window.NativeScanner.startNativeScanner();
        // Native scanner completed successfully - don't fall back to browser scanner
        console.log('[ScannerCore] === NATIVE SCANNER COMPLETED SUCCESSFULLY ===');
        console.log('[ScannerCore] Resetting scanner state to idle');
        scannerState = 'idle'; // Reset to idle since native scanner handles its own state
        if (window.ScannerUI) {
          window.ScannerUI.updateScannerButton(false);
          window.ScannerUI.hideScannerViewport();
          window.ScannerUI.hideScannerStatus();
        }
        console.log('[ScannerCore] === NATIVE SCANNER COMPLETE - RETURNING ===');
        return;
      } catch (nativeError) {
        console.error('[ScannerCore] === NATIVE SCANNER FAILED ===', nativeError);
        // Only fall back to browser scanner if it's not a cancellation
        const errorMessage = nativeError.message || nativeError.toString();
        const isCancellation = errorMessage.includes('cancel') || 
                              errorMessage.includes('Cancel') ||
                              errorMessage.includes('User cancelled') ||
                              errorMessage.includes('user cancelled') ||
                              errorMessage.includes('cancelled') ||
                              errorMessage.includes('Cancelled') ||
                              errorMessage.includes('back') ||
                              errorMessage.includes('Back') ||
                              errorMessage.includes('dismiss') ||
                              errorMessage.includes('Dismiss');
        
        if (isCancellation) {
          console.log('[ScannerCore] === NATIVE SCANNER CANCELLED BY USER ===');
          scannerState = 'idle';
          if (window.ScannerUI) {
            window.ScannerUI.updateScannerButton(false);
            window.ScannerUI.hideScannerViewport();
            window.ScannerUI.hideScannerStatus();
          }
          console.log('[ScannerCore] === NATIVE SCANNER CANCELLED - RETURNING ===');
          return;
        }
        
        // Don't fall back to browser scanner for other errors
        console.log('[ScannerCore] === NATIVE SCANNER FAILED WITH NON-CANCELLATION ERROR - NOT FALLING BACK ===');
        throw nativeError;
      }
    } else {
      console.log('[ScannerCore] Native scanner not available:', {
        isCapacitor: window.isCapacitor,
        platform: window.platform,
        hasNativeScanner: !!window.NativeScanner,
        hasStartNativeScanner: !!(window.NativeScanner && window.NativeScanner.startNativeScanner)
      });
    }
    
    // Only try browser scanner if native scanner is not available
    // This should never happen if native scanner is working properly
    if (!shouldTryNative && window.ScannerZXing && window.ScannerZXing.startBrowserScanner) {
      console.log('[ScannerCore] === ATTEMPTING BROWSER SCANNER (NATIVE NOT AVAILABLE) ===');
      
      // Only show viewport when we're actually going to use browser scanner
      if (window.ScannerUI) {
        window.ScannerUI.showScannerViewport();
        window.ScannerUI.updateScannerStatus('Starting browser scanner...', 'info');
      }
      
      await window.ScannerZXing.startBrowserScanner();
      scannerState = 'scanning';
      console.log('[ScannerCore] === BROWSER SCANNER STARTED ===');
      return;
    } else if (shouldTryNative) {
      console.log('[ScannerCore] Native scanner is available, skipping browser scanner initialization');
      // Double-check that ZXing is not active
      if (window.ScannerZXing && window.ScannerZXing.zxingActive) {
        console.log('[ScannerCore] WARNING: ZXing scanner is active despite native scanner being available!');
        console.log('[ScannerCore] Stopping ZXing scanner...');
        try {
          await window.ScannerZXing.stopBrowserScanner();
          console.log('[ScannerCore] ZXing scanner stopped successfully');
        } catch (error) {
          console.error('[ScannerCore] Error stopping ZXing scanner:', error);
        }
      }
    } else {
      console.log('[ScannerCore] Browser scanner not available:', {
        hasScannerZXing: !!window.ScannerZXing,
        hasStartBrowserScanner: !!(window.ScannerZXing && window.ScannerZXing.startBrowserScanner)
      });
    }
    
    throw new Error('No scanner available - neither native nor browser scanner detected');
    
  } catch (error) {
    console.error('[ScannerCore] === FAILED TO START SCANNER ===', error);
    scannerState = 'idle';
    
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerButton(false);
      window.ScannerUI.hideScannerViewport();
      window.ScannerUI.updateScannerStatus(`Scanner failed: ${error.message}`, 'error');
      window.ScannerUI.showNotification('Failed to start scanner. Please try again.', 'error');
    }
  }
}

/**
 * Stop scanner function
 */
async function stopScanner() {
  console.log('[ScannerCore] === STOP SCANNER CALLED ===');
  console.log('[ScannerCore] Current scanner state:', scannerState);
  
  if (scannerState === 'idle') {
    console.log('[ScannerCore] Scanner already idle, nothing to stop');
    return;
  }
  
  scannerState = 'stopping';
  console.log('[ScannerCore] Setting scanner state to stopping');
  
  try {
    // Stop native scanner if active
    if (window.isCapacitor && window.platform !== 'web' && window.NativeScanner && window.NativeScanner.stopNativeScanner) {
      console.log('[ScannerCore] Stopping native scanner...');
      await window.NativeScanner.stopNativeScanner();
      console.log('[ScannerCore] Native scanner stopped');
    } else {
      console.log('[ScannerCore] Native scanner not available for stopping');
    }
    
    // Stop browser scanner if active (always try to stop it if it exists)
    if (window.ScannerZXing && window.ScannerZXing.stopBrowserScanner) {
      console.log('[ScannerCore] Stopping browser scanner...');
      await window.ScannerZXing.stopBrowserScanner();
      console.log('[ScannerCore] Browser scanner stopped');
    } else {
      console.log('[ScannerCore] Browser scanner not available for stopping');
    }
    
    // Reset state
    console.log('[ScannerCore] Resetting scanner state to idle');
    scannerState = 'idle';
    lastDetectedCode = null;
    detectionCount = 0;
    scanAttempts = 0;
    isProcessingScan = false;
    
    // Update UI
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerButton(false);
      window.ScannerUI.hideScannerViewport();
      window.ScannerUI.hideScannerStatus();
    }
    
    console.log('[ScannerCore] === SCANNER STOPPED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('[ScannerCore] === ERROR STOPPING SCANNER ===', error);
    scannerState = 'idle';
    
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerButton(false);
      window.ScannerUI.hideScannerViewport();
      window.ScannerUI.showNotification('Error stopping scanner', 'error');
    }
  }
}

/**
 * Handle scanner button click
 */
function handleScannerButtonClick() {
  if (scannerState === 'idle') {
    startSmartScanner();
  } else {
    stopScanner();
  }
}

/**
 * Reset scanner UI to idle state
 */
function resetToIdle() {
  scannerState = 'idle';
  lastDetectedCode = null;
  detectionCount = 0;
  scanAttempts = 0;
  isProcessingScan = false;
  hasNotifiedScan = false;
  
  if (window.ScannerUI) {
    window.ScannerUI.updateScannerButton(false);
    window.ScannerUI.hideScannerViewport();
    window.ScannerUI.hideScannerStatus();
  }
}

/**
 * Handle successful scan detection
 */
function handleScanDetection(code) {
  // Prevent multiple simultaneous scans
  if (isProcessingScan || hasNotifiedScan) {
    return;
  }
  
  const now = Date.now();
  
  // Check cooldown
  if (now - lastScanTime < SCAN_COOLDOWN) {
    return;
  }
  
  // Check if this is the same code as before
  if (code === lastDetectedCode) {
    detectionCount++;
    
    // Require multiple consistent detections
    if (detectionCount < REQUIRED_DETECTIONS) {
      return;
    }
  } else {
    // New code detected
    lastDetectedCode = code;
    detectionCount = 1;
    return;
  }
  
  // Valid scan detected - prevent further processing
  isProcessingScan = true;
  hasNotifiedScan = true; // Prevent duplicate notifications
  lastScanTime = now;
  scanAttempts = 0;
  
  // Stop scanner immediately to prevent more detections
  stopScanner();
  
  // Handle the successful scan
  if (window.ScannerData && window.ScannerData.handleSuccessfulScan) {
    window.ScannerData.handleSuccessfulScan(code);
  }
  
  // Reset processing flag after a delay
  setTimeout(() => {
    isProcessingScan = false;
  }, 10000); // 10 second lock
}

/**
 * Handle scan error
 */
function handleScanError(error) {
  // Only count actual errors, not "no barcode found"
  if (error.name === 'NotFoundException' || 
      error.name === 'NoMultiFormatReader' ||
      error.message.includes('No MultiFormat Readers')) {
    return; // Don't count these as errors
  }
  
  scanAttempts++;
  
  if (scanAttempts >= MAX_SCAN_ATTEMPTS) {
    if (window.ScannerUI) {
      window.ScannerUI.showNotification('Too many scan errors. Stopping scanner.', 'error');
    }
    stopScanner();
    return;
  }
  
  if (window.ScannerData && window.ScannerData.handleScanError) {
    window.ScannerData.handleScanError(error);
  }
}

/**
 * Check if scanner is available
 */
function isScannerAvailable() {
  const nativeAvailable = window.isCapacitor && 
                         window.platform !== 'web' && 
                         window.NativeScanner && 
                         window.NativeScanner.startNativeScanner;
  const browserAvailable = window.ScannerZXing && window.ScannerZXing.isBrowserScannerAvailable;
  
  console.log('[ScannerCore] Scanner availability check:', {
    nativeAvailable,
    browserAvailable,
    isCapacitor: window.isCapacitor,
    platform: window.platform,
    hasNativeScanner: !!window.NativeScanner,
    hasStartNativeScanner: !!(window.NativeScanner && window.NativeScanner.startNativeScanner),
    hasScannerZXing: !!window.ScannerZXing
  });
  
  // Prioritize native scanner - if native is available, we don't need browser scanner
  if (nativeAvailable) {
    console.log('[ScannerCore] Native scanner available - browser scanner not needed');
    return true;
  }
  
  // Only return true for browser scanner if native is not available
  if (browserAvailable) {
    console.log('[ScannerCore] Browser scanner available (native not available)');
    return true;
  }
  
  console.log('[ScannerCore] No scanner available');
  return false;
}

/**
 * Get current scanner state
 */
function getScannerState() {
  return scannerState;
}

// Export functions to global scope
window.ScannerCore = {
  startSmartScanner,
  stopScanner,
  handleScannerButtonClick,
  resetToIdle,
  handleScanDetection,
  handleScanError,
  isScannerAvailable,
  getScannerState,
  scannerState,
  isNative: window.isNative,
  isCapacitor: window.isCapacitor,
  platform: window.platform
}; 