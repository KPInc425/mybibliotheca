/**
 * MyBibliotheca ZXing Scanner Module
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
  return typeof ZXingBrowser !== 'undefined' && 
         typeof ZXingBrowser.BrowserMultiFormatReader !== 'undefined';
}

/**
 * Start browser scanner using ZXing-js
 */
async function startBrowserScanner() {
  if (!isBrowserScannerAvailable()) {
    throw new Error('ZXing-js library not available');
  }
  
  if (zxingActive) {
    return;
  }
  
  try {
    // Create ZXing reader
    zxingCodeReader = new ZXingBrowser.BrowserMultiFormatReader();
    
    // Get video element
    const video = document.getElementById('scanner-video');
    if (!video) {
      throw new Error('Video element not found');
    }
    
    // Start video stream
    zxingStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
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
    
  } catch (error) {
    console.error('Failed to start browser scanner:', error);
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
  if (!zxingActive) {
    return;
  }
  
  try {
    // Stop ZXing reader - handle different API versions
    if (zxingCodeReader) {
      try {
        // Try the newer API first
        if (typeof zxingCodeReader.reset === 'function') {
          await zxingCodeReader.reset();
        } else if (typeof zxingCodeReader.stopAsyncDecode === 'function') {
          zxingCodeReader.stopAsyncDecode();
        } else if (typeof zxingCodeReader.stop === 'function') {
          zxingCodeReader.stop();
        }
      } catch (resetError) {
        console.warn('Error resetting ZXing reader:', resetError);
        // Continue with cleanup even if reset fails
      }
      zxingCodeReader = null;
    }
    
    // Stop video stream
    if (zxingStream) {
      zxingStream.getTracks().forEach(track => track.stop());
      zxingStream = null;
    }
    
    // Clear video element
    const video = document.getElementById('scanner-video');
    if (video) {
      video.srcObject = null;
    }
    
    zxingActive = false;
    
  } catch (error) {
    console.error('Error stopping browser scanner:', error);
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

// Export functions to global scope
window.ScannerZXing = {
  startBrowserScanner,
  stopBrowserScanner,
  isBrowserScannerAvailable,
  getBrowserScannerStatus,
  zxingActive
}; 