/**
 * BookOracle ZXing Scanner Module
 * Handles ZXing-js browser-based barcode scanning
 */

// ZXing-js integration for browser scanning
let zxingCodeReader = null;
let zxingStream = null;
let zxingActive = false;

/**
 * Check if browser scanner is available
 */
function isBrowserScannerAvailable() {
  const hasZXingBrowser = typeof ZXingBrowser !== 'undefined';
  const hasBrowserMultiFormatReader = hasZXingBrowser && typeof ZXingBrowser.BrowserMultiFormatReader !== 'undefined';
  
  console.log('[ScannerZXing] Browser scanner availability check:', {
    hasZXingBrowser,
    hasBrowserMultiFormatReader,
    ZXingBrowser: typeof ZXingBrowser,
    BrowserMultiFormatReader: hasZXingBrowser ? typeof ZXingBrowser.BrowserMultiFormatReader : 'N/A'
  });
  
  return hasZXingBrowser && hasBrowserMultiFormatReader;
}

/**
 * Start browser scanner using ZXing-js
 */
async function startBrowserScanner() {
  console.log('[ScannerZXing] === START BROWSER SCANNER CALLED ===');
  console.log('[ScannerZXing] Current zxingActive state:', zxingActive);
  
  // Check if native scanner is available - if so, don't start ZXing
  if (window.isCapacitor && window.platform !== 'web' && window.NativeScanner) {
    console.log('[ScannerZXing] WARNING: Native scanner is available, refusing to start ZXing scanner');
    throw new Error('Native scanner is available - ZXing scanner should not be used');
  }
  
  if (!isBrowserScannerAvailable()) {
    console.error('[ScannerZXing] ZXing-js library not available');
    throw new Error('ZXing-js library not available');
  }
  
  if (zxingActive) {
    console.log('[ScannerZXing] Scanner already active, skipping');
    return;
  }
  
  console.log('[ScannerZXing] === INITIALIZING ZXING SCANNER ===');
  
  try {
    console.log('[ScannerZXing] Creating ZXing reader...');
    // Create ZXing reader
    zxingCodeReader = new ZXingBrowser.BrowserMultiFormatReader();
    
    // Get video element
    const video = document.getElementById('scanner-video');
    if (!video) {
      console.error('[ScannerZXing] Video element not found');
      throw new Error('Video element not found');
    }
    
    console.log('[ScannerZXing] Requesting camera permissions...');
    // Start video stream
    zxingStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
    console.log('[ScannerZXing] Camera stream obtained, setting up video...');
    video.srcObject = zxingStream;
    zxingActive = true;
    
    // Start decoding
    await zxingCodeReader.decodeFromVideoDevice(
      null,
      video,
      (result, error) => {
        if (result) {
          // Successful scan
          if (window.ScannerCore && window.ScannerCore.handleScanDetection) {
            window.ScannerCore.handleScanDetection(result.text);
          }
        } else if (error) {
          // Only handle actual errors, not "no barcode found"
          if (error.name !== 'NotFoundException' && 
              error.name !== 'NoMultiFormatReader' &&
              !error.message.includes('No MultiFormat Readers')) {
            if (window.ScannerCore && window.ScannerCore.handleScanError) {
              window.ScannerCore.handleScanError(error);
            }
          }
          // "No barcode found" is normal and should not be treated as an error
        }
      }
    );
    
    // Update UI
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerStatus('Scanner active - point camera at barcode', 'success');
    }
    
    console.log('[ScannerZXing] === ZXING SCANNER STARTED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('[ScannerZXing] === FAILED TO START ZXING SCANNER ===', error);
    zxingActive = false;
    
    // Clean up on error
    if (zxingStream) {
      zxingStream.getTracks().forEach(track => track.stop());
      zxingStream = null;
    }
    
    throw error;
  }
}

/**
 * Stop browser scanner
 */
async function stopBrowserScanner() {
  console.log('[ScannerZXing] === STOP BROWSER SCANNER CALLED ===');
  console.log('[ScannerZXing] Current zxingActive state:', zxingActive);
  
  if (!zxingActive) {
    console.log('[ScannerZXing] Browser scanner not active, nothing to stop');
    return;
  }
  
  console.log('[ScannerZXing] === STOPPING ZXING SCANNER ===');
  
  try {
    // Stop ZXing reader - handle different API versions
    if (zxingCodeReader) {
      console.log('[ScannerZXing] Stopping ZXing code reader...');
      try {
        // Try the newer API first
        if (typeof zxingCodeReader.reset === 'function') {
          await zxingCodeReader.reset();
        } else if (typeof zxingCodeReader.stopAsyncDecode === 'function') {
          zxingCodeReader.stopAsyncDecode();
        } else if (typeof zxingCodeReader.stop === 'function') {
          zxingCodeReader.stop();
        }
        console.log('[ScannerZXing] ZXing code reader stopped');
      } catch (resetError) {
        console.warn('[ScannerZXing] Error resetting ZXing reader:', resetError);
        // Continue with cleanup even if reset fails
      }
      zxingCodeReader = null;
    }
    
    // Stop video stream
    if (zxingStream) {
      console.log('[ScannerZXing] Stopping video stream...');
      zxingStream.getTracks().forEach(track => track.stop());
      zxingStream = null;
      console.log('[ScannerZXing] Video stream stopped');
    }
    
    // Clear video element
    const video = document.getElementById('scanner-video');
    if (video) {
      console.log('[ScannerZXing] Clearing video element...');
      video.srcObject = null;
    }
    
    zxingActive = false;
    console.log('[ScannerZXing] === ZXING SCANNER STOPPED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('[ScannerZXing] === ERROR STOPPING ZXING SCANNER ===', error);
    zxingActive = false;
  }
}

/**
 * Get browser scanner status
 */
function getBrowserScannerStatus() {
  return {
    available: isBrowserScannerAvailable(),
    active: zxingActive,
    hasStream: !!zxingStream
  };
}

/**
 * Debug ZXing scanner availability
 */
function debugZXingScanner() {
  console.log('[ScannerZXing] Debug function called');
  
  const debugInfo = {
    ZXingBrowser: typeof ZXingBrowser,
    BrowserMultiFormatReader: typeof ZXingBrowser !== 'undefined' ? typeof ZXingBrowser.BrowserMultiFormatReader : 'N/A',
    isAvailable: isBrowserScannerAvailable(),
    zxingActive,
    hasStream: !!zxingStream,
    hasCodeReader: !!zxingCodeReader
  };
  
  console.log('[ScannerZXing] Debug info:', debugInfo);
  return debugInfo;
}

// Export functions to global scope
window.ScannerZXing = {
  startBrowserScanner,
  stopBrowserScanner,
  isBrowserScannerAvailable,
  getBrowserScannerStatus,
  debugZXingScanner,
  zxingActive
}; 