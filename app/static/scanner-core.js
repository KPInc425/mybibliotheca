/**
 * MyBibliotheca Core Scanner Module
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

// Environment detection
let isCapacitor = typeof Capacitor !== 'undefined';
let isNative = isCapacitor && Capacitor.isNative;

/**
 * Smart Scanner - Main entry point that tries multiple approaches
 */
async function startSmartScanner() {
  if (scannerState !== 'idle') {
    return;
  }
  
  scannerState = 'starting';
  hasNotifiedScan = false; // Reset notification flag
  
  // Update UI
  if (window.ScannerUI) {
    window.ScannerUI.updateScannerButton(true);
    window.ScannerUI.showScannerViewport();
    window.ScannerUI.updateScannerStatus('Initializing scanner...', 'info');
  }
  
  try {
    // Try native scanner first if available
    if (isNative && window.NativeScanner && window.NativeScanner.startNativeScanner) {
      if (window.ScannerUI) {
        window.ScannerUI.updateScannerStatus('Starting native scanner...', 'info');
      }
      
      await window.NativeScanner.startNativeScanner();
      scannerState = 'scanning';
      return;
    }
    
    // Fallback to browser scanner
    if (window.ScannerZXing && window.ScannerZXing.startBrowserScanner) {
      if (window.ScannerUI) {
        window.ScannerUI.updateScannerStatus('Starting browser scanner...', 'info');
      }
      
      await window.ScannerZXing.startBrowserScanner();
      scannerState = 'scanning';
      return;
    }
    
    throw new Error('No scanner available');
    
  } catch (error) {
    console.error('Failed to start scanner:', error);
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
  if (scannerState === 'idle') {
    return;
  }
  
  scannerState = 'stopping';
  
  try {
    // Stop native scanner if active
    if (isNative && window.NativeScanner && window.NativeScanner.stopNativeScanner) {
      await window.NativeScanner.stopNativeScanner();
    }
    
    // Stop browser scanner if active
    if (window.ScannerZXing && window.ScannerZXing.stopBrowserScanner) {
      await window.ScannerZXing.stopBrowserScanner();
    }
    
    // Reset state
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
    
  } catch (error) {
    console.error('Error stopping scanner:', error);
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
  return isNative || (window.ScannerZXing && window.ScannerZXing.isBrowserScannerAvailable);
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
  isNative
}; 