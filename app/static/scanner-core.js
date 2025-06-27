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
 * Initialize scanner system and request permissions early
 */
async function initializeScannerSystem() {
  console.log('[ScannerCore] === INITIALIZING SCANNER SYSTEM ===');
  
  // Request camera permissions early if native scanner is available
  if (window.isCapacitor && window.platform !== 'web' && window.NativeScanner && window.NativeScanner.requestCameraPermissionsEarly) {
    console.log('[ScannerCore] Requesting camera permissions early...');
    try {
      await window.NativeScanner.requestCameraPermissionsEarly();
      // Don't show any status messages here - let the early request handle it silently
    } catch (error) {
      console.log('[ScannerCore] Early permission request failed:', error.message);
      // Don't show error messages for early permission requests
    }
  }
  
  console.log('[ScannerCore] Scanner system initialized');
}

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
    // Check if we should try native scanner first
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
    
    // Try native scanner if available
    if (shouldTryNative) {
      console.log('[ScannerCore] === ATTEMPTING NATIVE SCANNER ===');
      if (window.ScannerUI) {
        window.ScannerUI.updateScannerStatus('Starting native scanner...', 'info');
      }
      
      try {
        console.log('[ScannerCore] Calling NativeScanner.startNativeScanner()...');
        await window.NativeScanner.startNativeScanner();
        // Native scanner completed successfully
        console.log('[ScannerCore] === NATIVE SCANNER COMPLETED SUCCESSFULLY ===');
        scannerState = 'idle';
        if (window.ScannerUI) {
          window.ScannerUI.updateScannerButton(false);
          window.ScannerUI.hideScannerViewport();
          window.ScannerUI.hideScannerStatus();
        }
        return;
      } catch (nativeError) {
        console.error('[ScannerCore] === NATIVE SCANNER FAILED ===', nativeError);
        
        // Check if it's a cancellation
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
          return;
        }
        
        // For other errors, fall back to browser scanner
        console.log('[ScannerCore] === NATIVE SCANNER FAILED - FALLING BACK TO BROWSER SCANNER ===');
      }
    }
    
    // Try browser scanner (either because native is not available or native failed)
    if (window.ScannerZXing && window.ScannerZXing.startBrowserScanner) {
      console.log('[ScannerCore] === ATTEMPTING BROWSER SCANNER ===');
      
      // Show viewport for browser scanner
      if (window.ScannerUI) {
        window.ScannerUI.showScannerViewport();
        window.ScannerUI.updateScannerStatus('Starting browser scanner...', 'info');
      }
      
      try {
        await window.ScannerZXing.startBrowserScanner();
        scannerState = 'scanning';
        console.log('[ScannerCore] === BROWSER SCANNER STARTED SUCCESSFULLY ===');
        return;
      } catch (browserError) {
        console.error('[ScannerCore] === BROWSER SCANNER FAILED ===', browserError);
        throw browserError;
      }
    } else {
      console.log('[ScannerCore] Browser scanner not available:', {
        hasScannerZXing: !!window.ScannerZXing,
        hasStartBrowserScanner: !!(window.ScannerZXing && window.ScannerZXing.startBrowserScanner)
      });
    }
    
    // If we get here, no scanner is available
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
 * Stop scanner and ensure proper cleanup
 */
async function stopScanner() {
  console.log('[ScannerCore] === STOP SCANNER CALLED ===');
  console.log('[ScannerCore] Current scanner state:', scannerState);
  
  if (scannerState === 'idle') {
    console.log('[ScannerCore] Scanner already idle, nothing to stop');
    return;
  }
  
  console.log('[ScannerCore] === STOPPING SCANNER ===');
  scannerState = 'stopping';
  
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
    
    // Force cleanup of any remaining video streams directly
    await forceCameraCleanup();
    
    // Reset state
    console.log('[ScannerCore] Resetting scanner state to idle');
    scannerState = 'idle';
    lastDetectedCode = null;
    detectionCount = 0;
    scanAttempts = 0;
    isProcessingScan = false;
    hasNotifiedScan = false;
    
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
    
    // Force cleanup even on error
    try {
      await forceCameraCleanup();
    } catch (cleanupError) {
      console.warn('[ScannerCore] Error during forced cleanup:', cleanupError);
    }
    
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerButton(false);
      window.ScannerUI.hideScannerViewport();
      window.ScannerUI.showNotification('Error stopping scanner', 'error');
    }
  }
}

/**
 * Force cleanup of any remaining camera streams
 */
async function forceCameraCleanup() {
  console.log('[ScannerCore] === FORCE CAMERA CLEANUP ===');
  
  try {
    // Stop any video streams that might still be active
    const video = document.getElementById('scanner-video');
    if (video && video.srcObject) {
      console.log('[ScannerCore] Force stopping video stream...');
      const stream = video.srcObject;
      if (stream && stream.getTracks) {
        const tracks = stream.getTracks();
        console.log('[ScannerCore] Found', tracks.length, 'tracks to force stop');
        tracks.forEach((track, index) => {
          console.log('[ScannerCore] Force stopping track', index, ':', track.kind);
          track.stop();
        });
      }
      video.srcObject = null;
      video.pause();
    }
    
    // Clear any other video elements that might have streams
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video, index) => {
      if (video.srcObject) {
        console.log('[ScannerCore] Force stopping video', index, 'stream...');
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
        video.pause();
      }
    });
    
    // Force stop any remaining media streams using MediaDevices API
    try {
      console.log('[ScannerCore] Checking for any remaining media streams...');
      
      // Get all media streams that might be active
      const mediaStreams = [];
      
      // Check if there are any global streams we can access
      if (window.currentMediaStream) {
        mediaStreams.push(window.currentMediaStream);
      }
      
      // Stop all found streams
      mediaStreams.forEach((stream, index) => {
        console.log('[ScannerCore] Force stopping global stream', index);
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      // Clear any global stream references
      window.currentMediaStream = null;
      
    } catch (streamError) {
      console.warn('[ScannerCore] Error checking global streams:', streamError);
    }
    
    // Additional cleanup for any remaining media streams
    try {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices && mediaDevices.enumerateDevices) {
        const devices = await mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('[ScannerCore] Available video devices after force cleanup:', videoDevices.length);
        
        // Log device details for debugging
        videoDevices.forEach((device, index) => {
          console.log('[ScannerCore] Video device', index, ':', device.label || 'Unknown device');
        });
      }
    } catch (enumError) {
      console.warn('[ScannerCore] Error enumerating devices during force cleanup:', enumError);
    }
    
    // Force garbage collection hint (if available)
    if (window.gc) {
      console.log('[ScannerCore] Requesting garbage collection...');
      window.gc();
    }
    
    console.log('[ScannerCore] === FORCE CAMERA CLEANUP COMPLETED ===');
    
  } catch (error) {
    console.error('[ScannerCore] === ERROR DURING FORCE CAMERA CLEANUP ===', error);
  }
}

/**
 * Handle scanner button click
 */
function handleScannerButtonClick(event) {
  // Prevent form submission if this is called from a form button
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
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
  
  // Only update UI elements, don't call cleanup functions to avoid circular dependency
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

/**
 * Debug scanner system and diagnose issues
 */
function debugScannerSystem() {
  console.log('[ScannerCore] === SCANNER SYSTEM DEBUG ===');
  
  const debugInfo = {
    // Environment
    isCapacitor: window.isCapacitor,
    isNative: window.isNative,
    platform: window.platform,
    userAgent: navigator.userAgent,
    
    // Scanner state
    scannerState: scannerState,
    hasNotifiedScan: hasNotifiedScan,
    isProcessingScan: isProcessingScan,
    
    // Native scanner
    hasNativeScanner: !!window.NativeScanner,
    nativeScannerMethods: window.NativeScanner ? Object.keys(window.NativeScanner) : [],
    hasStartNativeScanner: !!(window.NativeScanner && window.NativeScanner.startNativeScanner),
    
    // Browser scanner
    hasScannerZXing: !!window.ScannerZXing,
    zxingMethods: window.ScannerZXing ? Object.keys(window.ScannerZXing) : [],
    hasStartBrowserScanner: !!(window.ScannerZXing && window.ScannerZXing.startBrowserScanner),
    zxingActive: window.ScannerZXing ? window.ScannerZXing.zxingActive : 'N/A',
    
    // ZXing library
    hasZXingBrowser: typeof ZXingBrowser !== 'undefined',
    hasBrowserMultiFormatReader: typeof ZXingBrowser !== 'undefined' && typeof ZXingBrowser.BrowserMultiFormatReader !== 'undefined',
    
    // UI
    hasScannerUI: !!window.ScannerUI,
    uiMethods: window.ScannerUI ? Object.keys(window.ScannerUI) : [],
    
    // Media devices
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    
    // DOM elements
    hasScannerVideo: !!document.getElementById('scanner-video'),
    hasScannerBtn: !!document.getElementById('scannerBtn'),
    
    // Capacitor
    hasCapacitor: typeof Capacitor !== 'undefined',
    capacitorPlugins: window.isCapacitor ? Object.keys(Capacitor.Plugins || {}) : 'N/A'
  };
  
  console.log('[ScannerCore] Debug info:', debugInfo);
  
  // Test scanner availability
  const nativeAvailable = window.isCapacitor && 
                         window.platform !== 'web' && 
                         window.NativeScanner && 
                         window.NativeScanner.startNativeScanner;
  
  const browserAvailable = window.ScannerZXing && 
                          window.ScannerZXing.isBrowserScannerAvailable && 
                          window.ScannerZXing.isBrowserScannerAvailable();
  
  console.log('[ScannerCore] Scanner availability:', {
    nativeAvailable,
    browserAvailable,
    shouldTryNative: debugInfo.isCapacitor && debugInfo.platform !== 'web' && debugInfo.hasStartNativeScanner
  });
  
  // Show debug info in UI if available
  if (window.ScannerUI && window.ScannerUI.showNotification) {
    const availableScanners = [];
    if (nativeAvailable) availableScanners.push('Native');
    if (browserAvailable) availableScanners.push('Browser');
    
    window.ScannerUI.showNotification(
      `Debug: ${availableScanners.length} scanner(s) available (${availableScanners.join(', ')})`, 
      availableScanners.length > 0 ? 'success' : 'error'
    );
  }
  
  return debugInfo;
}

/**
 * Nuclear cleanup - last resort for stubborn camera connections
 */
async function nuclearCleanup() {
  console.log('[ScannerCore] === NUCLEAR CLEANUP CALLED ===');
  
  try {
    // Call ZXing nuclear cleanup if available
    if (window.ScannerZXing && window.ScannerZXing.nuclearCameraCleanup) {
      console.log('[ScannerCore] Calling ZXing nuclear cleanup...');
      await window.ScannerZXing.nuclearCameraCleanup();
    }
    
    // Additional core-level cleanup
    console.log('[ScannerCore] Performing core-level nuclear cleanup...');
    
    // Reset all scanner state
    scannerState = 'idle';
    lastDetectedCode = null;
    detectionCount = 0;
    scanAttempts = 0;
    isProcessingScan = false;
    hasNotifiedScan = false;
    
    // Clear any remaining global references
    window.currentMediaStream = null;
    
    // Force UI reset
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerButton(false);
      window.ScannerUI.hideScannerViewport();
      window.ScannerUI.hideScannerStatus();
    }
    
    console.log('[ScannerCore] === NUCLEAR CLEANUP COMPLETED ===');
    
  } catch (error) {
    console.error('[ScannerCore] === ERROR DURING NUCLEAR CLEANUP ===', error);
  }
}

// Export functions to global scope
window.ScannerCore = {
  startSmartScanner,
  stopScanner,
  handleScannerButtonClick,
  resetToIdle,
  handleScanDetection,
  handleScanError,
  forceCameraCleanup,
  debugScannerSystem,
  isScannerAvailable,
  getScannerState,
  initializeScannerSystem,
  scannerState,
  isNative: window.isNative,
  isCapacitor: window.isCapacitor,
  platform: window.platform,
  nuclearCleanup
};

// Ensure camera cleanup on page unload
window.addEventListener('beforeunload', function() {
  console.log('[ScannerCore] Page unloading - ensuring camera cleanup...');
  if (scannerState !== 'idle') {
    console.log('[ScannerCore] Scanner active during page unload - forcing cleanup');
    forceCameraCleanup().catch(error => {
      console.warn('[ScannerCore] Error during page unload cleanup:', error);
    });
  }
});

// Ensure camera cleanup on page visibility change (tab switching)
document.addEventListener('visibilitychange', function() {
  if (document.hidden && scannerState !== 'idle') {
    console.log('[ScannerCore] Page hidden - ensuring camera cleanup...');
    forceCameraCleanup().catch(error => {
      console.warn('[ScannerCore] Error during visibility change cleanup:', error);
    });
  }
}); 