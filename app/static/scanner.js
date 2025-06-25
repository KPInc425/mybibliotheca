/**
 * MyBibliotheca Barcode Scanner Module
 * Handles all barcode scanning functionality with multiple API support
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

// Constants
const SCAN_COOLDOWN = 2000; // 2 seconds between scans
const REQUIRED_DETECTIONS = 3; // Number of consistent detections required
const MAX_SCAN_ATTEMPTS = 5; // Maximum invalid scan attempts

// Environment detection
let isCapacitor = typeof Capacitor !== 'undefined';
let isNative = isCapacitor && Capacitor.isNative;

// ZXing-js integration for browser scanning
let zxingCodeReader = null;
let zxingStream = null;
let zxingActive = false; // Track if ZXing-js is running

// Debug log function for UI and console
function debugLog(message, data = null) {
  const debugPanel = document.getElementById('debugPanel');
  const debugContent = document.getElementById('debugContent');
  if (debugPanel && debugContent) {
    debugPanel.style.display = 'block';
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '0.5rem';
    logEntry.style.borderBottom = '1px solid #dee2e6';
    logEntry.style.paddingBottom = '0.5rem';
    let logText = `[${timestamp}] ${message}`;
    if (data) {
      logText += `: ${JSON.stringify(data, null, 2)}`;
    }
    logEntry.textContent = logText;
    debugContent.appendChild(logEntry);
    // Keep only last 10 entries
    while (debugContent.children.length > 10) {
      debugContent.removeChild(debugContent.firstChild);
    }
    // Auto-scroll to bottom
    debugPanel.scrollTop = debugPanel.scrollHeight;
  }
  // Also log to console
  console.log(`[DEBUG] ${message}`, data);
}

// Clear debug log function
function clearDebugLog() {
  const debugContent = document.getElementById('debugContent');
  if (debugContent) {
    debugContent.innerHTML = '';
  }
}

/**
 * Setup mobile optimizations for better scanning experience
 */
function setupMobileOptimizations() {
  console.log("Setting up mobile optimizations...");
  
  // Add mobile-specific CSS for better camera experience
  const style = document.createElement('style');
  style.textContent = `
    .mobile-scanner {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: #000;
    }
    
    .mobile-scanner video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .mobile-scanner .scanner-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    
    .mobile-scanner .scanner-frame {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 250px;
      height: 150px;
      border: 2px solid #fff;
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    }
    
    .mobile-scanner .scanner-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
    }
    
    .mobile-scanner .scanner-controls button {
      padding: 10px 20px;
      border: none;
      border-radius: 25px;
      background: rgba(255, 255, 255, 0.9);
      color: #000;
      font-weight: bold;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Setup mobile focus detection
 */
function setupMobileFocusDetection() {
  const videoElement = document.getElementById('scanner-video');
  if (!videoElement) return;
  
  // Add tap-to-focus on mobile devices
  let touchStartTime = 0;
  let touchEndTime = 0;
  
  videoElement.addEventListener('touchstart', (e) => {
    touchStartTime = new Date().getTime();
  });
  
  videoElement.addEventListener('touchend', (e) => {
    touchEndTime = new Date().getTime();
    const touchDuration = touchEndTime - touchStartTime;
    
    // If it's a quick tap (less than 200ms), try to focus
    if (touchDuration < 200) {
      const touch = e.changedTouches[0];
      const rect = videoElement.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;
      
      // Try to focus at the tap location
      if (videoElement.srcObject && videoElement.srcObject.getVideoTracks) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        if (track && track.getCapabilities && track.getSettings) {
          const capabilities = track.getCapabilities();
          if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
            track.applyConstraints({
              advanced: [{
                focusMode: 'manual',
                focusDistance: 0.1 // Close focus
              }]
            }).catch(err => {
              console.log('Focus not supported:', err);
            });
          }
        }
      }
    }
  });
}

/**
 * Get camera constraints for optimal barcode scanning
 */
function getCameraConstraints() {
  const constraints = {
    video: {
      facingMode: "environment", // Use back camera on mobile
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, min: 15 }
    }
  };
  
  // Add advanced constraints for better focus and exposure
  if (navigator.mediaDevices.getSupportedConstraints) {
    const supported = navigator.mediaDevices.getSupportedConstraints();
    
    if (supported.focusMode) {
      constraints.video.focusMode = { ideal: "continuous" };
    }
    
    if (supported.exposureMode) {
      constraints.video.exposureMode = { ideal: "continuous" };
    }
    
    if (supported.whiteBalanceMode) {
      constraints.video.whiteBalanceMode = { ideal: "continuous" };
    }
    
    if (supported.zoom) {
      constraints.video.zoom = { ideal: 1.0 };
    }
  }
  
  return constraints;
}

/**
 * Smart Scanner - Main entry point that tries multiple approaches
 */
async function startSmartScanner() {
  console.log("[Smart Scanner] Starting smart barcode scanner...");
  
  try {
    // Check for native scanner availability first
    if (isCapacitor && Capacitor.Plugins.BarcodeScanner) {
      console.log("[Smart Scanner] Native scanner available, trying first...");
      try {
        await startNativeScanner();
        return; // Success - don't continue to browser scanner
      } catch (error) {
        console.log("[Smart Scanner] Native scanner failed:", error.message);
        
        // Show error and ask user what to do
        const useBrowserScanner = confirm(
          `Native scanner failed: ${error.message}\n\n` +
          'Would you like to try the browser scanner instead?\n\n' +
          'Click OK to use browser scanner\n' +
          'Click Cancel to use manual entry'
        );
        
        if (useBrowserScanner) {
          console.log("[Smart Scanner] User chose browser scanner");
          showNotification('Switching to browser scanner...', 'info', 3000);
          await startBrowserScanner();
        } else {
          console.log("[Smart Scanner] User chose manual entry");
          showNotification('Please enter the ISBN manually', 'info', 3000);
          
          // Focus on ISBN field for manual entry
          setTimeout(() => {
            const isbnField = document.getElementById('isbn');
            if (isbnField) {
              isbnField.focus();
              isbnField.select();
              isbnField.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          }, 500);
          
          // Reset to idle state
          resetToIdle();
          return;
        }
      }
    } else {
      // No native scanner available, use browser scanner
      console.log("[Smart Scanner] No native scanner available, using browser scanner");
      await startBrowserScanner();
    }
    
  } catch (error) {
    console.error("[Smart Scanner] Error:", error);
    showNotification(`Scanner error: ${error.message}`, 'error', 4000);
    resetToIdle();
  }
}

/**
 * Browser Scanner - Tries multiple browser APIs
 */
async function startBrowserScanner() {
  const scannerBtn = document.getElementById('scannerBtn');
  const statusDiv = document.getElementById('scannerStatus');
  debugLog('startBrowserScanner called');

  if (!scannerBtn || !statusDiv) {
    debugLog('Scanner UI elements not found', {scannerBtn, statusDiv});
    throw new Error('Scanner UI elements not found');
  }

  // Check if scanner is already running or stopping
  if (scannerState === 'scanning' || scannerState === 'stopping' || zxingActive) {
    debugLog('Scanner already running or stopping, ignoring start request');
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
  showNotification('🌐 ZXing Scanner: Point camera at barcode clearly. Only ISBN/EAN-13 barcodes will be accepted.', 'info', 8000);
  debugLog('ZXing-js scanner notification shown');

  // Start ZXing-js scanner - check for npm module first, then fallback to CDN
  let ZXingBrowser = null;
  if (typeof window.ZXingBrowser !== 'undefined') {
    ZXingBrowser = window.ZXingBrowser;
  } else if (typeof window.ZXing !== 'undefined') {
    ZXingBrowser = window.ZXing;
  } else if (typeof window.zxing !== 'undefined') {
    ZXingBrowser = window.zxing;
  } else {
    debugLog('ZXing-js library not loaded!', Object.keys(window).filter(k => k.toLowerCase().includes('zxing')));
    showNotification('ZXing-js library not loaded! Please refresh the page.', 'error', 4000);
    resetToIdle();
    return;
  }

  zxingCodeReader = new ZXingBrowser.BrowserMultiFormatReader();
  const videoElement = document.getElementById('scanner-video');
  if (!videoElement) {
    debugLog('Scanner error: Video element not found');
    showNotification('Scanner error: Video element not found', 'error', 4000);
    resetToIdle();
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
    debugLog('Camera stream started');
  } catch (err) {
    debugLog('Camera access denied or unavailable', err);
    showNotification('Camera access denied or unavailable.', 'error', 4000);
    resetToIdle();
    return;
  }

  // Update button to show stop state
  scannerBtn.disabled = false;
  scannerBtn.textContent = '⏹️ Stop Scanner';
  scannerBtn.className = 'btn-stop';
  scannerState = 'scanning';
  debugLog('Scanner state set to scanning');

  zxingActive = true;

  // Start decoding
  zxingCodeReader.decodeFromVideoElement(videoElement, (result, err) => {
    // Check if scanner is still active before processing anything
    if (!zxingActive || scannerState === 'stopping' || scannerState === 'idle') {
      // Only log this occasionally to reduce spam
      if (Math.random() < 0.01) { // Only log 1% of the time
        debugLog('[ZXing-js] Scanner not active, ignoring result');
      }
      return;
    }
    
    if (result) {
      const code = result.text;
      let format = result.barcodeFormat;
      debugLog('ZXing-js full scan result', result);

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
        debugLog('Inferred barcode format', {code, format});
      }

      debugLog('ZXing-js scan result', {code, format});
      // Accept EAN-13 ISBNs even if format is undefined but code matches
      if ((format === 'EAN_13' || typeof format === 'undefined') && /^97[89][0-9]{10}$/.test(code)) {
        debugLog('Valid ISBN detected', code);
        document.getElementById('isbn').value = code;
        showNotification(`ISBN detected: ${code}`, 'success', 2000);
        stopZXingScanner();
        // Auto-fetch the book data after a short delay
        setTimeout(() => { 
          debugLog('[ZXing-js] Calling handleSuccessfulScan');
          if (window.handleSuccessfulScan) {
            window.handleSuccessfulScan(code);
          } else {
            debugLog('[ZXing-js] handleSuccessfulScan not available, calling autofetchBookData');
            if (window.autofetchBookData) {
              window.autofetchBookData();
            } else {
              debugLog('[ZXing-js] autofetchBookData not available');
            }
          }
        }, 500);
      } else {
        debugLog('Non-ISBN barcode detected', {code, format});
        showNotification('Non-ISBN barcode detected. Please scan a valid book barcode.', 'warning', 2000);
      }
    } else if (err && err.name !== 'NotFoundException') {
      // Only log errors that aren't "no barcode found" errors
      debugLog('ZXing-js scan error', err);
    }
  });
}

function stopZXingScanner() {
  debugLog('[stopZXingScanner] Starting stop process');
  
  // Prevent multiple simultaneous stops
  if (scannerState === 'stopping') {
    debugLog('[stopZXingScanner] Already stopping, but forcing completion');
    // Force complete the stop process instead of ignoring
  }
  
  scannerState = 'stopping';
  zxingActive = false;
  
  // Set a timeout to force stop if stuck
  const forceStopTimeout = setTimeout(() => {
    if (scannerState === 'stopping') {
      debugLog('[stopZXingScanner] Force stopping scanner after timeout');
      scannerState = 'idle';
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
      
      showNotification('Scanner force stopped.', 'warning', 1500);
    }
  }, 3000); // 3 second timeout
  
  debugLog('[stopZXingScanner] Stopping ZXing-js scanner');
  if (zxingCodeReader) {
    try {
      // Stop the decode loop first - check if reset method exists
      if (typeof zxingCodeReader.reset === 'function') {
        zxingCodeReader.reset();
      } else {
        debugLog('[stopZXingScanner] ZXing reader reset method not available');
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
      debugLog('[stopZXingScanner] Error resetting ZXing reader:', err);
    }
    zxingCodeReader = null;
  }
  
  debugLog('[stopZXingScanner] Stopping video stream');
  if (zxingStream) {
    try {
      zxingStream.getTracks().forEach(track => {
        track.stop();
        debugLog('[stopZXingScanner] Stopped track:', track.kind);
      });
    } catch (err) {
      debugLog('[stopZXingScanner] Error stopping tracks:', err);
    }
    zxingStream = null;
  }
  
  // Completely destroy and recreate the video element to force ZXing-js to stop
  const scannerDiv = document.getElementById('scanner');
  const videoElement = document.getElementById('scanner-video');
  if (videoElement && scannerDiv) {
    debugLog('[stopZXingScanner] Destroying video element to force ZXing-js stop');
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
    debugLog('[stopZXingScanner] Created new video element');
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
  scannerState = 'idle';
  debugLog('[stopZXingScanner] Scanner state reset to idle');
  
  showNotification('Scanner stopped.', 'info', 1500);
  debugLog('[stopZXingScanner] Stop process complete');
}

/**
 * Start Scanner - Main browser scanner initialization
 */
function startScanner() {
  const scannerDiv = document.getElementById('scanner');
  const scannerBtn = document.getElementById('scannerBtn');
  
  // Show loading state
  scannerBtn.disabled = true;
  scannerBtn.textContent = '🔄 Starting...';
  
  scannerDiv.style.display = 'block';

  if (scanner) {
    // Stop animation frame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // Stop video stream
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    
    scanner = null;
  }

  // Reset scan attempts
  scanAttempts = 0;

  // Add timeout to prevent stuck state
  const timeoutId = setTimeout(() => {
    if (!scanner) {
      console.error("Scanner initialization timeout");
      showNotification('Scanner initialization timed out. Please try again.', 'error', 4000);
      resetToIdle();
    }
  }, 15000); // 15 second timeout

  initializeBarcodeDetectorScanner();

  function initializeBarcodeDetectorScanner() {
    console.log("Initializing BarcodeDetector scanner...");
    
    // Get the video element
    const videoElement = document.getElementById('scanner-video');
    if (!videoElement) {
      console.error("Video element not found!");
      showNotification('Scanner error: Video element not found', 'error', 4000);
      resetToIdle();
      return;
    }
    
    // Check if BarcodeDetector is supported
    console.log("Checking BarcodeDetector support:");
    console.log("- 'BarcodeDetector' in window:", 'BarcodeDetector' in window);
    console.log("- typeof window.BarcodeDetector:", typeof window.BarcodeDetector);
    console.log("- window.BarcodeDetector:", window.BarcodeDetector);
    
    if (!('BarcodeDetector' in window)) {
      console.error("BarcodeDetector not supported in this browser");
      
      // Detect current browser and features for personalized guidance
      const { browser, version } = detectBrowser();
      const features = detectFeatures();
      
      console.log("Feature detection results:", features);
      
      // Show diagnostic information and try alternative scanner
      showBarcodeDetectorDiagnostics(browser, version, features);
      
      // Try alternative scanner automatically
      setTimeout(() => {
        startAlternativeScanner();
      }, 2000);
      
      return;
    }
    
    // Create BarcodeDetector instance with ISBN formats
    const barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39']
    });
    
    // Get camera stream with simplified constraints to avoid conflicts
    getCameraConstraints()
      .then(constraints => {
        return navigator.mediaDevices.getUserMedia(constraints);
      })
      .then(stream => {
        videoStream = stream;
        videoElement.srcObject = stream;
        return new Promise((resolve) => {
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve();
          };
        });
      })
      .then(() => {
        console.log("Camera started successfully");
        
        // Start scanning loop
        function scanFrame() {
          if (!scanner) return; // Stop if scanner was stopped
          
          // Check if video element is ready for detection
          if (videoElement.readyState < 2) { // HAVE_CURRENT_DATA
            animationFrameId = requestAnimationFrame(scanFrame);
            return;
          }
          
          barcodeDetector.detect(videoElement)
            .then(barcodes => {
              if (barcodes.length > 0) {
                const barcode = barcodes[0];
                const now = Date.now();
                
                if (now - lastScanTime < SCAN_COOLDOWN) {
                  animationFrameId = requestAnimationFrame(scanFrame);
                  return;
                }
                
                const code = barcode.rawValue;
                const format = barcode.format;
                
                // Check if this is the same code as last detection
                if (code === lastDetectedCode) {
                  detectionCount++;
                  console.log(`BarcodeDetector detected code: ${code} (detection ${detectionCount}/${REQUIRED_DETECTIONS})`);
                } else {
                  // New code detected, reset counter
                  lastDetectedCode = code;
                  detectionCount = 1;
                  console.log(`BarcodeDetector detected new code: ${code} (detection 1/${REQUIRED_DETECTIONS})`);
                }
                
                // Only proceed if we have enough consistent detections
                if (detectionCount < REQUIRED_DETECTIONS) {
                  animationFrameId = requestAnimationFrame(scanFrame);
                  return;
                }
                
                // Reset for next scan
                lastDetectedCode = null;
                detectionCount = 0;
                
                scanAttempts++;
                
                if (isValidISBNCode(code, format)) {
                  console.log("Valid ISBN detected:", code);
                  document.getElementById('isbn').value = code;
                  stopScanner();
                  lastScanTime = now;
                  
                  // Show success notification
                  showNotification(`ISBN detected: ${code}`, 'success', 2000);
                  
                  // Auto-fetch the book data
                  if (window.handleSuccessfulScan) {
                    window.handleSuccessfulScan(code);
                  } else {
                    setTimeout(() => { if (window.autofetchBookData) window.autofetchBookData(); }, 500);
                  }
                } else {
                  console.log("Invalid ISBN format:", code, format);
                  showNotification(`Invalid format: ${format}`, 'warning', 2000);
                  
                  // Stop after too many invalid attempts
                  if (scanAttempts >= MAX_SCAN_ATTEMPTS) {
                    stopScanner();
                    showNotification('Too many invalid scans. Please try manual entry.', 'error', 3000);
                  }
                }
              } else {
                // No barcode detected, reset detection counter
                if (lastDetectedCode) {
                  console.log("No barcode detected, resetting detection counter");
                  lastDetectedCode = null;
                  detectionCount = 0;
                }
              }
              
              // Continue scanning
              if (scanner) {
                animationFrameId = requestAnimationFrame(scanFrame);
              }
            })
            .catch(error => {
              console.log("Scanning error:", error);
              // Only log errors, don't stop scanning unless it's a critical error
              if (error.name === 'InvalidStateError') {
                // Video element not ready, wait a bit before retrying
                setTimeout(() => {
                  if (scanner) {
                    animationFrameId = requestAnimationFrame(scanFrame);
                  }
                }, 100);
              } else {
                // Continue scanning for other errors
                if (scanner) {
                  animationFrameId = requestAnimationFrame(scanFrame);
                }
              }
            });
        }
        
        // Start scanning
        scanner = barcodeDetector;
        scannerState = 'scanning';
        scanFrame();
        
        // Set up mobile focus detection
        setupMobileFocusDetection();
        
        clearTimeout(timeoutId);
        
        console.log("BarcodeDetector scanner initialized successfully");
        
        // Update button state to show stop option
        const scannerBtn = document.getElementById('scannerBtn');
        scannerBtn.disabled = false;
        scannerBtn.textContent = '⏹️ Stop Scanner';
        scannerBtn.className = 'btn btn-danger';
        scannerBtn.onclick = handleScannerButtonClick;
        
        // Show success notification
        showNotification('Scanner ready! Point camera at barcode', 'success', 3000);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error("BarcodeDetector scanner init error:", err);
        
        let errorMessage = "Error starting scanner: ";
        if (err.name === 'NotAllowedError') {
          errorMessage += "Camera access denied. Please allow camera permissions.";
          showNotification(errorMessage, 'error', 5000);
          resetToIdle();
        } else if (err.name === 'NotFoundError') {
          errorMessage += "No camera found on this device.";
          showNotification(errorMessage, 'error', 5000);
          resetToIdle();
        } else if (err.name === 'NotReadableError') {
          errorMessage += "Camera is already in use by another application.";
          showNotification(errorMessage, 'error', 5000);
          resetToIdle();
        } else {
          console.log("Camera constraints not supported, trying minimal constraints...");
          showNotification('Trying alternative camera settings...', 'info', 2000);
          
          // Try with minimal constraints as fallback
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
          }).then(stream => {
            videoStream = stream;
            videoElement.srcObject = stream;
            return new Promise((resolve) => {
              videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
              };
            });
          }).then(() => {
            console.log("Camera started with minimal constraints");
            
            // Start scanning with minimal setup
            scanner = barcodeDetector;
            scannerState = 'scanning';
            
            // Set up mobile focus detection for minimal mode
            setupMobileFocusDetection();
            
            function scanFrameMinimal() {
              if (!scanner) return;
              
              if (videoElement.readyState < 2) {
                animationFrameId = requestAnimationFrame(scanFrameMinimal);
                return;
              }
              
              barcodeDetector.detect(videoElement)
                .then(barcodes => {
                  if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    const now = Date.now();
                    
                    if (now - lastScanTime < SCAN_COOLDOWN) {
                      animationFrameId = requestAnimationFrame(scanFrameMinimal);
                      return;
                    }
                    
                    const code = barcode.rawValue;
                    const format = barcode.format;
                    
                    if (code === lastDetectedCode) {
                      detectionCount++;
                    } else {
                      lastDetectedCode = code;
                      detectionCount = 1;
                    }
                    
                    if (detectionCount < REQUIRED_DETECTIONS) {
                      animationFrameId = requestAnimationFrame(scanFrameMinimal);
                      return;
                    }
                    
                    lastDetectedCode = null;
                    detectionCount = 0;
                    scanAttempts++;
                    
                    if (isValidISBNCode(code, format)) {
                      console.log("Valid ISBN detected:", code);
                      document.getElementById('isbn').value = code;
                      stopScanner();
                      lastScanTime = now;
                      
                      showNotification(`ISBN detected: ${code}`, 'success', 2000);
                      
                      if (window.handleSuccessfulScan) {
                        window.handleSuccessfulScan(code);
                      } else {
                        setTimeout(() => { if (window.autofetchBookData) window.autofetchBookData(); }, 500);
                      }
                    } else {
                      console.log("Invalid ISBN format:", code, format);
                      showNotification(`Invalid format: ${format}`, 'warning', 2000);
                      
                      if (scanAttempts >= MAX_SCAN_ATTEMPTS) {
                        stopScanner();
                        showNotification('Too many invalid scans. Please try manual entry.', 'error', 3000);
                      }
                    }
                  } else {
                    if (lastDetectedCode) {
                      lastDetectedCode = null;
                      detectionCount = 0;
                    }
                  }
                  
                  if (scanner) {
                    animationFrameId = requestAnimationFrame(scanFrameMinimal);
                  }
                })
                .catch(error => {
                  console.log("Minimal scanning error:", error);
                  if (scanner) {
                    animationFrameId = requestAnimationFrame(scanFrameMinimal);
                  }
                });
            }
            
            scanFrameMinimal();
            
            // Update button state to show stop option
            const scannerBtn = document.getElementById('scannerBtn');
            scannerBtn.disabled = false;
            scannerBtn.textContent = '⏹️ Stop Scanner';
            scannerBtn.className = 'btn btn-danger';
            scannerBtn.onclick = handleScannerButtonClick;
            
            showNotification('Scanner ready! Point camera at barcode', 'success', 3000);
          }).catch(minimalError => {
            console.error("Minimal constraints also failed:", minimalError);
            showNotification('Camera access failed. Please check permissions and try again.', 'error', 5000);
            resetToIdle();
          });
        }
      });
  }
}

/**
 * Alternative scanner using multiple browser APIs and approaches
 */
function startAlternativeScanner() {
  console.log("Starting alternative scanner with multiple approaches...");
  
  const scannerBtn = document.getElementById('scannerBtn');
  const statusDiv = document.getElementById('scannerStatus');
  
  // Show loading state
  scannerBtn.disabled = true;
  scannerBtn.textContent = '🔄 Starting...';
  
  // Show status
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 15px;">
        <h4 style="color: #0056b3; margin-bottom: 10px;">🔍 Multi-API Scanner</h4>
        <p style="margin-bottom: 15px;">
          Trying multiple scanning approaches...
        </p>
      </div>
    `;
    statusDiv.style.background = '#e7f3ff';
    statusDiv.style.border = '2px solid #0056b3';
    statusDiv.style.borderRadius = '10px';
    statusDiv.style.color = '#333';
  }
  
  // Try to access camera with basic constraints
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  })
  .then(stream => {
    console.log("Camera access granted for alternative scanner");
    
    // Create video element if it doesn't exist
    let videoElement = document.getElementById('scanner-video');
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.id = 'scanner-video';
      videoElement.style.cssText = `
        width: 100%;
        max-width: 640px;
        height: auto;
        border-radius: 10px;
        margin: 10px auto;
        display: block;
      `;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;
      
      // Add to scanner div
      const scannerDiv = document.getElementById('scanner');
      if (scannerDiv) {
        scannerDiv.style.display = 'block';
        scannerDiv.appendChild(videoElement);
      }
    }
    
    videoStream = stream;
    videoElement.srcObject = stream;
    
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve();
      };
    });
  })
  .then(() => {
    console.log("Alternative scanner video started");
    
    // Try multiple scanning approaches in order of preference
    return tryMultipleScanningApproaches();
  })
  .catch(error => {
    console.error("Alternative scanner error:", error);
    
    let errorMessage = "Alternative scanner failed: ";
    if (error.name === 'NotAllowedError') {
      errorMessage += "Camera access denied. Please allow camera permissions.";
    } else if (error.name === 'NotFoundError') {
      errorMessage += "No camera found on this device.";
    } else if (error.name === 'NotReadableError') {
      errorMessage += "Camera is already in use by another application.";
    } else {
      errorMessage += error.message;
    }
    
    showNotification(errorMessage, 'error', 5000);
    
    // Reset UI
    resetToIdle();
    
    // Auto-focus on ISBN field for manual entry
    setTimeout(() => {
      const isbnField = document.getElementById('isbn');
      if (isbnField) {
        isbnField.focus();
        isbnField.select();
        showNotification('Please enter the ISBN number manually', 'info', 4000);
        
        // Smooth scroll to ISBN field
        isbnField.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 1000);
  });
}

/**
 * Try multiple scanning approaches
 */
async function tryMultipleScanningApproaches() {
  const statusDiv = document.getElementById('scannerStatus');
  const scannerBtn = document.getElementById('scannerBtn');
  
  // Approach 1: Try BarcodeDetector API (might have been enabled)
  if ('BarcodeDetector' in window) {
    console.log("BarcodeDetector is available, using it for scanning");
    updateScannerStatus('BarcodeDetector API active', 'success');
    startBarcodeDetectorScanning();
    return;
  }
  
  // Approach 2: Try Shape Detection API (includes barcode detection)
  if ('ShapeDetector' in window) {
    console.log("ShapeDetector available, trying barcode detection");
    updateScannerStatus('Shape Detection API active', 'info');
    if (await tryShapeDetectorScanning()) {
      return;
    }
  }
  
  // Approach 3: Try WebCodecs API (newer video processing)
  if ('VideoDecoder' in window) {
    console.log("WebCodecs available, trying video processing");
    updateScannerStatus('WebCodecs API active', 'info');
    if (await tryWebCodecsScanning()) {
      return;
    }
  }
  
  // Approach 4: Try canvas-based image processing
  console.log("Trying canvas-based image processing");
  updateScannerStatus('Canvas processing active', 'info');
  if (await tryCanvasBasedScanning()) {
    return;
  }
  
  // Approach 5: Manual camera mode as last resort
  console.log("All automated methods failed, using manual camera mode");
  startManualCameraMode();
}

/**
 * Try Shape Detection API
 */
async function tryShapeDetectorScanning() {
  try {
    const videoElement = document.getElementById('scanner-video');
    if (!videoElement) return false;
    
    // Create ShapeDetector for barcode detection
    const shapeDetector = new ShapeDetector({
      type: 'barcode'
    });
    
    // Set scanner state
    scanner = shapeDetector;
    scannerState = 'scanning';
    
    // Start scanning loop
    function scanFrame() {
      if (!scanner) return;
      
      if (videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(scanFrame);
        return;
      }
      
      shapeDetector.detect(videoElement)
        .then(shapes => {
          if (shapes.length > 0) {
            const shape = shapes[0];
            if (shape.type === 'barcode') {
              const code = shape.rawValue;
              console.log(`ShapeDetector detected: ${code}`);
              
              if (isValidISBNCode(code, shape.format)) {
                handleSuccessfulScan(code);
                return;
              }
            }
          }
          
          // Continue scanning
          if (scanner) {
            animationFrameId = requestAnimationFrame(scanFrame);
          }
        })
        .catch(error => {
          console.log("ShapeDetector error:", error);
          if (scanner) {
            animationFrameId = requestAnimationFrame(scanFrame);
          }
        });
    }
    
    scanFrame();
    updateScannerStatus('Shape Detection scanning...', 'success');
    return true;
    
  } catch (error) {
    console.log("ShapeDetector not working:", error);
    return false;
  }
}

/**
 * Try WebCodecs API
 */
async function tryWebCodecsScanning() {
  try {
    const videoElement = document.getElementById('scanner-video');
    if (!videoElement) return false;
    
    // Create canvas for video processing with willReadFrequently for better performance
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set scanner state
    scanner = 'webcodecs';
    scannerState = 'scanning';
    
    let detectionCount = 0;
    let lastDetectionTime = 0;
    const DETECTION_COOLDOWN = 2000; // 2 seconds between detections
    
    // Start processing loop
    function processFrame() {
      if (!scanner) return;
      
      if (videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      
      // Draw video frame to canvas
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Enhanced barcode detection
      const barcodeResult = enhancedBarcodeDetection(imageData);
      
      if (barcodeResult.detected) {
        const now = Date.now();
        if (now - lastDetectionTime > DETECTION_COOLDOWN) {
          detectionCount++;
          lastDetectionTime = now;
          
          console.log(`Enhanced barcode detection #${detectionCount}:`, barcodeResult);
          
          // Update status to show detection progress
          updateScannerStatus(`Barcode pattern detected! (${detectionCount}/3) - Hold steady...`, 'success');
          
          // If we have multiple consistent detections, try to extract text
          if (detectionCount >= 3) {
            console.log("Multiple barcode detections confirmed, attempting text extraction...");
            
            // Try to extract readable text from the barcode area
            const extractedText = attemptTextExtraction(imageData, barcodeResult.region);
            
            if (extractedText && isValidISBNCode(extractedText, 'unknown')) {
              console.log("ISBN extracted via WebCodecs:", extractedText);
              handleSuccessfulScan(extractedText);
              return;
            } else {
              // Reset detection count and continue
              detectionCount = 0;
              updateScannerStatus('WebCodecs processing...', 'info');
            }
          }
        }
      } else {
        // Reset detection count if no barcode detected
        if (detectionCount > 0) {
          detectionCount = 0;
          updateScannerStatus('WebCodecs processing...', 'info');
        }
      }
      
      // Continue processing
      if (scanner) {
        animationFrameId = requestAnimationFrame(processFrame);
      }
    }
    
    processFrame();
    updateScannerStatus('WebCodecs processing...', 'info');
    return true;
    
  } catch (error) {
    console.log("WebCodecs not working:", error);
    return false;
  }
}

/**
 * Try canvas-based image processing
 */
async function tryCanvasBasedScanning() {
  try {
    const videoElement = document.getElementById('scanner-video');
    if (!videoElement) return false;
    
    // Create canvas for processing with willReadFrequently for better performance
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set scanner state
    scanner = 'canvas';
    scannerState = 'scanning';
    
    let detectionCount = 0;
    let lastDetectionTime = 0;
    const DETECTION_COOLDOWN = 2000; // 2 seconds between detections
    
    // Start processing loop
    function processFrame() {
      if (!scanner) return;
      
      if (videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      
      // Draw video frame to canvas
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Enhanced barcode detection
      const barcodeResult = enhancedBarcodeDetection(imageData);
      
      if (barcodeResult.detected) {
        const now = Date.now();
        if (now - lastDetectionTime > DETECTION_COOLDOWN) {
          detectionCount++;
          lastDetectionTime = now;
          
          console.log(`Canvas barcode detection #${detectionCount}:`, barcodeResult);
          
          // Update status to show detection progress
          updateScannerStatus(`Barcode pattern detected! (${detectionCount}/3) - Hold steady...`, 'success');
          
          // If we have multiple consistent detections, try to extract text
          if (detectionCount >= 3) {
            console.log("Multiple barcode detections confirmed, attempting text extraction...");
            
            // Try to extract readable text from the barcode area
            const extractedText = attemptTextExtraction(imageData, barcodeResult.region);
            
            if (extractedText && isValidISBNCode(extractedText, 'unknown')) {
              console.log("ISBN extracted via Canvas:", extractedText);
              handleSuccessfulScan(extractedText);
              return;
            } else {
              // Reset detection count and continue
              detectionCount = 0;
              updateScannerStatus('Canvas processing...', 'info');
            }
          }
        }
      } else {
        // Reset detection count if no barcode detected
        if (detectionCount > 0) {
          detectionCount = 0;
          updateScannerStatus('Canvas processing...', 'info');
        }
      }
      
      // Continue processing
      if (scanner) {
        animationFrameId = requestAnimationFrame(processFrame);
      }
    }
    
    processFrame();
    updateScannerStatus('Canvas processing...', 'info');
    return true;
    
  } catch (error) {
    console.log("Canvas processing not working:", error);
    return false;
  }
}

/**
 * Start manual camera mode
 */
function startManualCameraMode() {
  const statusDiv = document.getElementById('scannerStatus');
  const scannerBtn = document.getElementById('scannerBtn');
  
  console.log("Starting manual camera mode");
  
  // Update status for manual camera mode
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 15px;">
        <h4 style="color: #856404; margin-bottom: 10px;">📷 Manual Camera Mode</h4>
        <p style="margin-bottom: 15px;">
          Camera is active. Point at barcode and read the ISBN number.
        </p>
        <div style="background: #fff3cd; padding: 10px; border-radius: 8px;">
          <p style="margin: 0; font-size: 0.9rem;">
            <strong>Instructions:</strong><br>
            1. Point camera at barcode clearly<br>
            2. Read the ISBN number from the video<br>
            3. Enter it manually in the field below
          </p>
        </div>
      </div>
    `;
    statusDiv.style.background = '#fff3cd';
    statusDiv.style.border = '2px solid #856404';
  }
  
  // Update button
  scannerBtn.disabled = false;
  scannerBtn.textContent = '⏹️ Stop Camera';
  scannerBtn.className = 'btn-stop';
  scannerBtn.onclick = handleScannerButtonClick;
  
  // Set scanner state
  scanner = 'manual-camera';
  scannerState = 'scanning';
  
  // Show success message
  showNotification('Camera ready! Read the ISBN number from the video', 'success', 3000);
  
  // Auto-focus on ISBN field for manual entry
  setTimeout(() => {
    const isbnField = document.getElementById('isbn');
    if (isbnField) {
      isbnField.focus();
      showNotification('Enter the ISBN number you see in the camera', 'info', 4000);
      
      // Smooth scroll to ISBN field
      isbnField.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, 1000);
}

/**
 * Stop scanner function
 */
function stopScanner() {
  console.log("Stopping scanner...");
  debugLog('[stopScanner] Starting main stop process');
  
  // Prevent multiple simultaneous stops
  if (scannerState === 'stopping') {
    debugLog('[stopScanner] Already stopping, ignoring duplicate call');
    return;
  }
  
  scannerState = 'stopping';
  
  // Stop ZXing-js scanner if active
  if (zxingActive) {
    debugLog('[stopScanner] ZXing-js scanner is active, stopping it');
    stopZXingScanner();
    return; // stopZXingScanner will handle the rest
  }
  
  // Stop animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Stop video stream
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  
  // Reset scanner state
  scanner = null;
  scannerState = 'idle';
  
  // Reset detection variables
  lastDetectedCode = null;
  detectionCount = 0;
  scanAttempts = 0;
  
  // Reset UI
  resetToIdle();
  
  console.log("Scanner stopped");
  debugLog('[stopScanner] Main stop process complete');
}

/**
 * Reset scanner UI to idle state
 */
function resetToIdle() {
  console.log("Scanner UI reset to idle state");
  
  const scannerBtn = document.getElementById('scannerBtn');
  const statusDiv = document.getElementById('scannerStatus');
  const scannerDiv = document.getElementById('scanner');
  
  if (scannerBtn) {
    scannerBtn.disabled = false;
    scannerBtn.textContent = '📷 Scan Barcode';
    scannerBtn.className = 'btn-scan';
    scannerBtn.onclick = handleScannerButtonClick;
  }
  
  if (statusDiv) {
    statusDiv.style.display = 'none';
  }
  
  if (scannerDiv) {
    scannerDiv.style.display = 'none';
    // Do NOT remove the video element here
  }
  
  scannerState = 'idle';
}

/**
 * Handle scanner button click
 */
function handleScannerButtonClick() {
  console.log("[DEBUG] Scanner button clicked, current state:", scannerState);
  debugLog('[handleScannerButtonClick] Button clicked, state:', scannerState);
  
  if (scannerState === 'idle') {
    scannerState = 'starting';
    debugLog('[handleScannerButtonClick] Starting scanner');
    startSmartScanner();
  } else if (scannerState === 'scanning' || scannerState === 'starting') {
    debugLog('[handleScannerButtonClick] Stopping scanner');
    stopScanner();
  } else if (scannerState === 'stopping') {
    debugLog('[handleScannerButtonClick] Scanner is stopping, ignoring click');
    // Ignore clicks while stopping to prevent conflicts
  }
}

/**
 * Start BarcodeDetector scanning with proper feedback
 */
function startBarcodeDetectorScanning() {
  console.log("Starting BarcodeDetector scanning with feedback...");
  
  const videoElement = document.getElementById('scanner-video');
  const statusDiv = document.getElementById('scannerStatus');
  
  if (!videoElement) {
    console.error("Video element not found for scanning");
    return;
  }
  
  // Create BarcodeDetector instance
  const barcodeDetector = new BarcodeDetector({
    formats: ['ean_13', 'ean_8', 'code_128', 'code_39']
  });
  
  // Set scanner state
  scanner = barcodeDetector;
  scannerState = 'scanning';
  
  // Start continuous scanning with feedback
  function scanFrame() {
    if (!scanner) return; // Stop if scanner was stopped
    
    // Check if video element is ready for detection
    if (videoElement.readyState < 2) { // HAVE_CURRENT_DATA
      animationFrameId = requestAnimationFrame(scanFrame);
      return;
    }
    
    barcodeDetector.detect(videoElement)
      .then(barcodes => {
        if (barcodes.length > 0) {
          const barcode = barcodes[0];
          const now = Date.now();
          
          if (now - lastScanTime < SCAN_COOLDOWN) {
            animationFrameId = requestAnimationFrame(scanFrame);
            return;
          }
          
          const code = barcode.rawValue;
          const format = barcode.format;
          
          console.log(`BarcodeDetector detected: ${code} (${format})`);
          
          // Update status to show detection
          if (statusDiv) {
            statusDiv.innerHTML = `
              <div style="text-align: center; padding: 15px;">
                <h4 style="color: #28a745; margin-bottom: 10px;">🎯 Barcode Detected!</h4>
                <p style="margin-bottom: 15px;">
                  Code: <strong>${code}</strong><br>
                  Format: ${format}
                </p>
                <div style="background: #d4edda; padding: 10px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 0.9rem;">
                    <strong>Processing...</strong> Validating ISBN format...
                  </p>
                </div>
              </div>
            `;
          }
          
          // Check if this is the same code as last detection
          if (code === lastDetectedCode) {
            detectionCount++;
            console.log(`Same code detected: ${code} (${detectionCount}/${REQUIRED_DETECTIONS})`);
          } else {
            // New code detected, reset counter
            lastDetectedCode = code;
            detectionCount = 1;
            console.log(`New code detected: ${code} (${detectionCount}/${REQUIRED_DETECTIONS})`);
          }
          
          // Only proceed if we have enough consistent detections
          if (detectionCount < REQUIRED_DETECTIONS) {
            animationFrameId = requestAnimationFrame(scanFrame);
            return;
          }
          
          // Reset for next scan
          lastDetectedCode = null;
          detectionCount = 0;
          
          scanAttempts++;
          
          if (isValidISBNCode(code, format)) {
            console.log("Valid ISBN detected:", code);
            
            // Update status for success
            if (statusDiv) {
              statusDiv.innerHTML = `
                <div style="text-align: center; padding: 15px;">
                  <h4 style="color: #28a745; margin-bottom: 10px;">✅ ISBN Found!</h4>
                  <p style="margin-bottom: 15px;">
                    <strong>${code}</strong>
                  </p>
                  <div style="background: #d4edda; padding: 10px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 0.9rem;">
                      <strong>Success!</strong> Filling in ISBN field and fetching book data...
                    </p>
                  </div>
                </div>
              `;
            }
            
            document.getElementById('isbn').value = code;
            stopScanner();
            lastScanTime = now;
            
            // Show success notification
            showNotification(`ISBN detected: ${code}`, 'success', 2000);
            
            // Auto-fetch the book data
            if (window.handleSuccessfulScan) {
              window.handleSuccessfulScan(code);
            } else {
              setTimeout(() => { if (window.autofetchBookData) window.autofetchBookData(); }, 500);
            }
          } else {
            console.log("Invalid ISBN format:", code, format);
            
            // Update status for invalid format
            if (statusDiv) {
              statusDiv.innerHTML = `
                <div style="text-align: center; padding: 15px;">
                  <h4 style="color: #ffc107; margin-bottom: 10px;">⚠️ Invalid Format</h4>
                  <p style="margin-bottom: 15px;">
                    Code: <strong>${code}</strong><br>
                    Format: ${format}
                  </p>
                  <div style="background: #fff3cd; padding: 10px; border-radius: 8px;">
                    <p style="margin: 0; font-size: 0.9rem;">
                      <strong>Not an ISBN.</strong> Please try a different barcode or use manual entry.
                    </p>
                  </div>
                </div>
              `;
              statusDiv.style.background = '#fff3cd';
              statusDiv.style.border = '2px solid #ffc107';
            }
            
            showNotification(`Invalid format: ${format}`, 'warning', 2000);
            
            // Stop after too many invalid attempts
            if (scanAttempts >= MAX_SCAN_ATTEMPTS) {
              stopScanner();
              showNotification('Too many invalid scans. Please try manual entry.', 'error', 3000);
              
              // Go to manual entry
              setTimeout(() => {
                const isbnField = document.getElementById('isbn');
                if (isbnField) {
                  isbnField.focus();
                  isbnField.select();
                  isbnField.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                }
              }, 1000);
            }
          }
        } else {
          // No barcode detected, reset detection counter
          if (lastDetectedCode) {
            console.log("No barcode detected, resetting detection counter");
            lastDetectedCode = null;
            detectionCount = 0;
          }
        }
        
        // Continue scanning
        if (scanner) {
          animationFrameId = requestAnimationFrame(scanFrame);
        }
      })
      .catch(error => {
        console.log("Scanning error:", error);
        // Only log errors, don't stop scanning unless it's a critical error
        if (error.name === 'InvalidStateError') {
          // Video element not ready, wait a bit before retrying
          setTimeout(() => {
            if (scanner) {
              animationFrameId = requestAnimationFrame(scanFrame);
            }
          }, 100);
        } else {
          // Continue scanning for other errors
          if (scanner) {
            animationFrameId = requestAnimationFrame(scanFrame);
          }
        }
      });
  }
  
  // Start scanning
  scanFrame();
  
  // Show initial scanning notification
  showNotification('Scanner active! Point camera at barcode', 'success', 3000);
}

// AJAX autofetch logic for Fetch Book Data button
function autofetchBookData() {
  debugLog('[autofetchBookData] Called');
  console.log('[autofetchBookData] Function called');
  
  // Show status in UI for mobile debugging
  const statusDiv = document.getElementById('scannerStatus');
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 15px;">
        <h4 style="color: #0056b3; margin-bottom: 10px;">🔍 Fetching Book Data</h4>
        <p style="margin-bottom: 15px;">
          Starting autofetch process...
        </p>
      </div>
    `;
    statusDiv.style.display = 'block';
  }
  
  const isbn = document.getElementById('isbn').value.trim();
  debugLog('[autofetchBookData] ISBN to fetch:', isbn);
  console.log('[autofetchBookData] ISBN value:', isbn);
  
  if (!isbn) {
    showNotification('Please enter an ISBN first', 'warning', 2000);
    debugLog('[autofetchBookData] No ISBN entered, aborting');
    console.log('[autofetchBookData] No ISBN entered, aborting');
    return;
  }
  
  const fetchBtn = document.getElementById('fetchBtn');
  debugLog('[autofetchBookData] Fetch button found:', !!fetchBtn);
  console.log('[autofetchBookData] Fetch button found:', !!fetchBtn);
  
  if (fetchBtn) {
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Fetching...';
  }
  
  // Update status for mobile debugging
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 15px;">
        <h4 style="color: #0056b3; margin-bottom: 10px;">🔍 Fetching Book Data</h4>
        <p style="margin-bottom: 15px;">
          Making request for ISBN: ${isbn}
        </p>
      </div>
    `;
  }
  
  debugLog('[autofetchBookData] Making fetch request to:', `/fetch_book/${isbn}`);
  console.log('[autofetchBookData] Making fetch request to:', `/fetch_book/${isbn}`);
  
  fetch(`/fetch_book/${isbn}`)
    .then(response => {
      debugLog('[autofetchBookData] Fetch response status:', response.status);
      console.log('[autofetchBookData] Fetch response status:', response.status);
      
      // Update status for mobile debugging
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div style="text-align: center; padding: 15px;">
            <h4 style="color: #0056b3; margin-bottom: 10px;">🔍 Fetching Book Data</h4>
            <p style="margin-bottom: 15px;">
              Response status: ${response.status}
            </p>
          </div>
        `;
      }
      
      if (!response.ok) return {};
      return response.json();
    })
    .then(data => {
      debugLog('[autofetchBookData] Fetch result:', data);
      console.log('[autofetchBookData] Fetch result:', data);
      console.log('[autofetchBookData] Available fields:', Object.keys(data));
      
      if (data && data.title) {
        // Fill in the form fields with correct field IDs
        const fieldsToFill = {
          'title': data.title,
          'author': data.author,
          'publisher': data.publisher,
          'publication_date': data.published_date,
          'pages': data.page_count && data.page_count > 0 ? data.page_count : null,
          'language': data.language,
          'format': data.format,
          'description': data.description
        };
        
        console.log('[autofetchBookData] Fields to fill:', fieldsToFill);
        
        // Fill each field and log the result
        Object.entries(fieldsToFill).forEach(([fieldId, value]) => {
          if (value) {
            const element = document.getElementById(fieldId);
            if (element) {
              element.value = value;
              console.log(`[autofetchBookData] Filled ${fieldId}:`, value);
            } else {
              console.log(`[autofetchBookData] Field ${fieldId} not found in form`);
            }
          }
        });
        
        // Update cover preview image
        const coverImg = document.getElementById('coverPreviewImg');
        if (coverImg) {
          if (data.cover) {
            coverImg.src = data.cover;
            console.log('[autofetchBookData] Updated cover image:', data.cover);
          } else {
            coverImg.src = '/static/bookshelf.png';
            console.log('[autofetchBookData] Using default cover image');
          }
        }
        
        // Update status for success
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div style="text-align: center; padding: 15px;">
              <h4 style="color: #28a745; margin-bottom: 10px;">✅ Book Data Fetched</h4>
              <p style="margin-bottom: 15px;">
                Successfully filled in book data<br>
                Title: ${data.title}<br>
                Author: ${data.author || 'Unknown'}
              </p>
            </div>
          `;
          statusDiv.style.background = '#d4edda';
          statusDiv.style.border = '2px solid #28a745';
        }
        
        showNotification('Book data fetched successfully!', 'success', 2000);
        debugLog('[autofetchBookData] Book data filled in form');
        console.log('[autofetchBookData] Book data filled in form');
      } else {
        console.log('[autofetchBookData] No book data found - data:', data);
        console.log('[autofetchBookData] Data is falsy:', !data);
        console.log('[autofetchBookData] No title field:', !data?.title);
        
        // Update status for failure
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div style="text-align: center; padding: 15px;">
              <h4 style="color: #dc3545; margin-bottom: 10px;">❌ No Book Data Found</h4>
              <p style="margin-bottom: 15px;">
                No book data found for ISBN: ${isbn}<br>
                Data received: ${JSON.stringify(data || {})}
              </p>
            </div>
          `;
          statusDiv.style.background = '#f8d7da';
          statusDiv.style.border = '2px solid #dc3545';
        }
        
        showNotification('No book data found for the provided ISBN.', 'warning', 2000);
        debugLog('[autofetchBookData] No book data found');
        console.log('[autofetchBookData] No book data found');
      }
    })
    .catch(error => {
      console.error('[autofetchBookData] AJAX autofetch error', error);
      
      // Update status for error
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div style="text-align: center; padding: 15px;">
            <h4 style="color: #dc3545; margin-bottom: 10px;">❌ Fetch Error</h4>
            <p style="margin-bottom: 15px;">
              Error fetching book data: ${error.message}
            </p>
          </div>
        `;
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.border = '2px solid #dc3545';
      }
      
      showNotification('Error fetching book data. Please try again.', 'error', 2000);
      debugLog('[autofetchBookData] AJAX autofetch error', error);
    })
    .finally(() => {
      if (fetchBtn) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = '🔍 Fetch Book Data';
      }
      debugLog('[autofetchBookData] Fetch complete');
      console.log('[autofetchBookData] Fetch complete');
    });
}

window.setupMobileOptimizations = setupMobileOptimizations;
window.autofetchBookData = autofetchBookData;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize scanner state
  scannerState = 'idle';
  zxingActive = false;
  debugLog('[DOMContentLoaded] Scanner state initialized to idle');
  
  const fetchBtn = document.getElementById('fetchBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', autofetchBookData);
  }
});

// Export functions for use in other modules
window.ScannerModule = {
  startSmartScanner,
  stopScanner,
  handleScannerButtonClick,
  resetToIdle
};

// Import utility functions from ScannerUtils if available
if (window.ScannerUtils) {
  const {
    enhancedBarcodeDetection,
    attemptTextExtraction,
    isValidISBNCode,
    detectBrowser,
    detectFeatures,
    showBarcodeDetectorDiagnostics,
    updateScannerStatus,
    handleSuccessfulScan,
    showNotification
  } = window.ScannerUtils;
  
  // Make them available in this module
  window.enhancedBarcodeDetection = enhancedBarcodeDetection;
  window.attemptTextExtraction = attemptTextExtraction;
  window.isValidISBNCode = isValidISBNCode;
  window.detectBrowser = detectBrowser;
  window.detectFeatures = detectFeatures;
  window.showBarcodeDetectorDiagnostics = showBarcodeDetectorDiagnostics;
  window.updateScannerStatus = updateScannerStatus;
  window.handleSuccessfulScan = handleSuccessfulScan;
  window.showNotification = showNotification;
} else {
  // Fallback implementations if ScannerUtils is not loaded
  console.warn('ScannerUtils not loaded, using fallback implementations');
  
  // Fallback for enhancedBarcodeDetection
  window.enhancedBarcodeDetection = function(imageData) {
    console.log('Fallback barcode detection called');
    return { detected: false, confidence: 0 };
  };
  
  // Fallback for attemptTextExtraction
  window.attemptTextExtraction = function(imageData, region) {
    console.log('Fallback text extraction called');
    return null;
  };
  
  // Fallback for isValidISBNCode
  window.isValidISBNCode = function(code, format) {
    if (!code || typeof code !== 'string') return false;
    const cleanCode = code.replace(/\D/g, '');
    return cleanCode.length === 10 || cleanCode.length === 13;
  };
  
  // Fallback for detectBrowser
  window.detectBrowser = function() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    return { browser, version };
  };
  
  // Fallback for detectFeatures
  window.detectFeatures = function() {
    return {
      isHttps: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      hasEnumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
      hasBarcodeDetector: 'BarcodeDetector' in window,
      barcodeDetectorType: typeof window.BarcodeDetector,
      barcodeDetectorValue: window.BarcodeDetector,
      hasShapeDetection: 'ShapeDetector' in window,
      hasTextDetector: 'TextDetector' in window,
      hasFaceDetector: 'FaceDetector' in window,
      cameraPermissions: 'unknown'
    };
  };
  
  // Fallback for showBarcodeDetectorDiagnostics
  window.showBarcodeDetectorDiagnostics = function(browser, version, features) {
    const statusDiv = document.getElementById('scannerStatus');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div style="text-align: center; padding: 15px;">
          <h4 style="color: #dc3545; margin-bottom: 10px;">📱 Barcode Scanner Not Available</h4>
          <p style="margin-bottom: 15px;">
            Your browser (${browser} ${version}) doesn't support barcode scanning.
          </p>
          <div style="background: #fff3cd; padding: 10px; border-radius: 8px;">
            <p style="margin: 0; font-size: 0.9rem;">
              Please use manual entry to add your books.
            </p>
          </div>
        </div>
      `;
      statusDiv.style.background = '#fff3cd';
      statusDiv.style.border = '2px solid #856404';
      statusDiv.style.display = 'block';
    }
  };
  
  // Fallback for updateScannerStatus
  window.updateScannerStatus = function(message, type = 'info') {
    const statusDiv = document.getElementById('scannerStatus');
    if (statusDiv) {
      const colors = {
        success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
        info: { bg: '#e7f3ff', border: '#0056b3', text: '#004085' },
        warning: { bg: '#fff3cd', border: '#856404', text: '#856404' },
        error: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' }
      };
      
      const color = colors[type] || colors.info;
      
      statusDiv.innerHTML = `
        <div style="text-align: center; padding: 15px;">
          <h4 style="color: ${color.text}; margin-bottom: 10px;">🔍 Scanner Active</h4>
          <p style="margin-bottom: 15px;">
            ${message}
          </p>
        </div>
      `;
      statusDiv.style.background = color.bg;
      statusDiv.style.border = `2px solid ${color.border}`;
    }
  };
  
  // Fallback for handleSuccessfulScan
  window.handleSuccessfulScan = function(code) {
    console.log("Successful scan:", code);
    
    const isbnField = document.getElementById('isbn');
    if (isbnField) {
      isbnField.value = code;
      isbnField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    if (window.ScannerModule && window.ScannerModule.stopScanner) {
      window.ScannerModule.stopScanner();
    }
    
    showNotification(`ISBN detected: ${code}`, 'success', 2000);
    
    setTimeout(() => {
      const fetchButton = document.querySelector('button[name="fetch"]');
      if (fetchButton) {
        fetchButton.click();
      }
    }, 500);
  };
  
  // Fallback for showNotification
  window.showNotification = function(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    switch (type) {
      case 'success':
        notification.style.background = '#28a745';
        break;
      case 'error':
        notification.style.background = '#dc3545';
        break;
      case 'warning':
        notification.style.background = '#ffc107';
        notification.style.color = '#212529';
        break;
      default:
        notification.style.background = '#17a2b8';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  };
} 