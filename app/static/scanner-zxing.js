/**
 * MyBibliotheca ZXing Scanner Module
 * Handles ZXing-js browser-based barcode scanning
 */

// ZXing-js integration for browser scanning
let zxingCodeReader = null;
let zxingStream = null;
let zxingActive = false; // Track if ZXing-js is running

/**
 * Browser Scanner - Tries multiple browser APIs
 */
async function startBrowserScanner() {
  const scannerBtn = document.getElementById('scannerBtn');
  const statusDiv = document.getElementById('scannerStatus');
  
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('startBrowserScanner called');
  }

  if (!scannerBtn || !statusDiv) {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('Scanner UI elements not found', {scannerBtn, statusDiv});
    }
    throw new Error('Scanner UI elements not found');
  }

  // Check if scanner is already running or stopping
  if (window.ScannerCore && (window.ScannerCore.scannerState === 'scanning' || 
                            window.ScannerCore.scannerState === 'stopping' || 
                            zxingActive)) {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('Scanner already running or stopping, ignoring start request');
    }
    return;
  }

  // Show loading state
  scannerBtn.disabled = true;
  scannerBtn.textContent = '🔄 Starting...';

  // Show scanner container
  const scannerDiv = document.getElementById('scanner');
  if (scannerDiv) {
    scannerDiv.style.display = 'block';
  }

  // Show notification
  if (window.showNotification) {
    window.showNotification('🌐 ZXing Scanner: Point camera at barcode clearly. Only ISBN/EAN-13 barcodes will be accepted.', 'info', 8000);
  }
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('ZXing-js scanner notification shown');
  }

  // Start ZXing-js scanner - check for npm module first, then fallback to CDN
  let ZXingBrowser = null;
  if (typeof window.ZXingBrowser !== 'undefined') {
    ZXingBrowser = window.ZXingBrowser;
  } else if (typeof window.ZXing !== 'undefined') {
    ZXingBrowser = window.ZXing;
  } else if (typeof window.zxing !== 'undefined') {
    ZXingBrowser = window.zxing;
  } else {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('ZXing-js library not loaded!', Object.keys(window).filter(k => k.toLowerCase().includes('zxing')));
    }
    if (window.showNotification) {
      window.showNotification('ZXing-js library not loaded! Please refresh the page.', 'error', 4000);
    }
    if (window.ScannerCore) {
      window.ScannerCore.resetToIdle();
    }
    return;
  }

  zxingCodeReader = new ZXingBrowser.BrowserMultiFormatReader();
  const videoElement = document.getElementById('scanner-video');
  if (!videoElement) {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('Scanner error: Video element not found');
    }
    if (window.showNotification) {
      window.showNotification('Scanner error: Video element not found', 'error', 4000);
    }
    if (window.ScannerCore) {
      window.ScannerCore.resetToIdle();
    }
    return;
  }

  // Clean up any previous stream
  if (zxingStream) {
    zxingStream.getTracks().forEach(track => track.stop());
    zxingStream = null;
  }

  // Get camera stream
  try {
    zxingStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    videoElement.srcObject = zxingStream;
    await videoElement.play();
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('Camera stream started');
    }
  } catch (err) {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('Camera access denied or unavailable', err);
    }
    if (window.showNotification) {
      window.showNotification('Camera access denied or unavailable.', 'error', 4000);
    }
    if (window.ScannerCore) {
      window.ScannerCore.resetToIdle();
    }
    return;
  }

  // Update button to show stop state
  scannerBtn.disabled = false;
  scannerBtn.textContent = '⏹️ Stop Scanner';
  scannerBtn.className = 'btn-stop';
  if (window.ScannerCore) {
    window.ScannerCore.scannerState = 'scanning';
    window.ScannerCore.debugLog('Scanner state set to scanning');
  }

  zxingActive = true;

  // Start decoding
  zxingCodeReader.decodeFromVideoElement(videoElement, (result, err) => {
    // Check if scanner is still active before processing anything
    if (!zxingActive || (window.ScannerCore && window.ScannerCore.scannerState === 'stopping') || 
        (window.ScannerCore && window.ScannerCore.scannerState === 'idle')) {
      // Only log this occasionally to reduce spam
      if (Math.random() < 0.01) { // Only log 1% of the time
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('[ZXing-js] Scanner not active, ignoring result');
        }
      }
      return;
    }
    
    if (result) {
      const code = result.text;
      let format = result.barcodeFormat;
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('ZXing-js full scan result', result);
      }

      // Fallback: try to infer format if undefined
      if (!format) {
        if (/^97[89][0-9]{10}$/.test(code)) {
          format = 'EAN_13';
        } else if (/^[0-9]{8}$/.test(code)) {
          format = 'EAN_8';
        } else if (/^[0-9]{12,13}$/.test(code)) {
          format = 'UPC';
        } else {
          format = 'UNKNOWN';
        }
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('Inferred barcode format', {code, format});
        }
      }

      if (window.ScannerCore) {
        window.ScannerCore.debugLog('ZXing-js scan result', {code, format});
      }
      // Accept EAN-13 ISBNs even if format is undefined but code matches
      if ((format === 'EAN_13' || typeof format === 'undefined') && /^97[89][0-9]{10}$/.test(code)) {
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('Valid ISBN detected', code);
        }
        document.getElementById('isbn').value = code;
        if (window.showNotification) {
          window.showNotification(`ISBN detected: ${code}`, 'success', 2000);
        }
        stopZXingScanner();
        // Auto-fetch the book data after a short delay
        setTimeout(() => { 
          if (window.ScannerCore) {
            window.ScannerCore.debugLog('[ZXing-js] Calling handleSuccessfulScan');
          }
          if (window.handleSuccessfulScan) {
            window.handleSuccessfulScan(code);
          } else {
            if (window.ScannerCore) {
              window.ScannerCore.debugLog('[ZXing-js] handleSuccessfulScan not available, calling autofetchBookData');
            }
            if (window.autofetchBookData) {
              window.autofetchBookData();
            } else {
              if (window.ScannerCore) {
                window.ScannerCore.debugLog('[ZXing-js] autofetchBookData not available');
              }
            }
          }
        }, 500);
      } else {
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('Non-ISBN barcode detected', {code, format});
        }
        if (window.showNotification) {
          window.showNotification('Non-ISBN barcode detected. Please scan a valid book barcode.', 'warning', 2000);
        }
      }
    } else if (err && err.name !== 'NotFoundException') {
      // Only log errors that aren't "no barcode found" errors
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('ZXing-js scan error', err);
      }
    }
  });
}

function stopZXingScanner() {
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[stopZXingScanner] Starting stop process');
  }
  
  // Prevent multiple simultaneous stops
  if (window.ScannerCore && window.ScannerCore.scannerState === 'stopping') {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('[stopZXingScanner] Already stopping, but forcing completion');
    }
    // Force complete the stop process instead of ignoring
  }
  
  if (window.ScannerCore) {
    window.ScannerCore.scannerState = 'stopping';
  }
  zxingActive = false;
  
  // Set a timeout to force stop if stuck
  const forceStopTimeout = setTimeout(() => {
    if (window.ScannerCore && window.ScannerCore.scannerState === 'stopping') {
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[stopZXingScanner] Force stopping scanner after timeout');
      }
      if (window.ScannerCore) {
        window.ScannerCore.scannerState = 'idle';
      }
      zxingActive = false;
      zxingCodeReader = null;
      zxingStream = null;
      
      const scannerBtn = document.getElementById('scannerBtn');
      if (scannerBtn) {
        scannerBtn.disabled = false;
        scannerBtn.textContent = '📷 Scan Barcode';
        scannerBtn.className = 'btn-scan';
      }
      
      const scannerDiv = document.getElementById('scanner');
      if (scannerDiv) {
        scannerDiv.style.display = 'none';
      }
      
      if (window.showNotification) {
        window.showNotification('Scanner force stopped.', 'warning', 1500);
      }
    }
  }, 3000); // 3 second timeout
  
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[stopZXingScanner] Stopping ZXing-js scanner');
  }
  if (zxingCodeReader) {
    try {
      // Stop the decode loop first - check if reset method exists
      if (typeof zxingCodeReader.reset === 'function') {
        zxingCodeReader.reset();
      } else {
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('[stopZXingScanner] ZXing reader reset method not available');
        }
      }
      // Force stop any ongoing decode operations
      if (zxingCodeReader._stopAsyncDecode) {
        zxingCodeReader._stopAsyncDecode();
      }
      // Additional cleanup for ZXing-js
      if (zxingCodeReader._videoElement) {
        zxingCodeReader._videoElement = null;
      }
      if (zxingCodeReader._timeoutHandler) {
        clearTimeout(zxingCodeReader._timeoutHandler);
        zxingCodeReader._timeoutHandler = null;
      }
    } catch (err) {
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[stopZXingScanner] Error resetting ZXing reader:', err);
      }
    }
    zxingCodeReader = null;
  }
  
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[stopZXingScanner] Stopping video stream');
  }
  if (zxingStream) {
    try {
      zxingStream.getTracks().forEach(track => {
        track.stop();
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('[stopZXingScanner] Stopped track:', track.kind);
        }
      });
    } catch (err) {
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[stopZXingScanner] Error stopping tracks:', err);
      }
    }
    zxingStream = null;
  }
  
  // Completely destroy and recreate the video element to force ZXing-js to stop
  const scannerDiv = document.getElementById('scanner');
  const videoElement = document.getElementById('scanner-video');
  if (videoElement && scannerDiv) {
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('[stopZXingScanner] Destroying video element to force ZXing-js stop');
    }
    videoElement.srcObject = null;
    videoElement.src = '';
    videoElement.load();
    videoElement.remove();
    
    // Create a new video element
    const newVideoElement = document.createElement('video');
    newVideoElement.id = 'scanner-video';
    newVideoElement.style.width = '100%';
    newVideoElement.style.height = '100%';
    newVideoElement.style.objectFit = 'cover';
    newVideoElement.autoplay = true;
    newVideoElement.muted = true;
    newVideoElement.playsInline = true;
    
    // Add the new video element to the scanner div
    scannerDiv.appendChild(newVideoElement);
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('[stopZXingScanner] Created new video element');
    }
  }
  
  // Reset button to scan state
  const scannerBtn = document.getElementById('scannerBtn');
  if (scannerBtn) {
    scannerBtn.disabled = false;
    scannerBtn.textContent = '📷 Scan Barcode';
    scannerBtn.className = 'btn-scan';
  }
  
  if (scannerDiv) {
    scannerDiv.style.display = 'none';
  }
  
  // Clear the timeout since we're stopping successfully
  clearTimeout(forceStopTimeout);
  
  // Reset state immediately
  if (window.ScannerCore) {
    window.ScannerCore.scannerState = 'idle';
    window.ScannerCore.debugLog('[stopZXingScanner] Scanner state reset to idle');
  }
  
  if (window.showNotification) {
    window.showNotification('Scanner stopped.', 'info', 1500);
  }
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[stopZXingScanner] Stop process complete');
  }
}

// Export ZXing scanner functions
window.ScannerZXing = {
  startBrowserScanner,
  stopZXingScanner,
  zxingCodeReader,
  zxingStream,
  zxingActive
};

// Make zxingActive available globally for other modules
window.zxingActive = zxingActive; 