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

// Constants
const SCAN_COOLDOWN = 2000; // 2 seconds between scans
const REQUIRED_DETECTIONS = 3; // Number of consistent detections required
const MAX_SCAN_ATTEMPTS = 5; // Maximum invalid scan attempts

// Environment detection
let isCapacitor = typeof Capacitor !== 'undefined';
let isNative = isCapacitor && Capacitor.isNative;

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
  if (window.zxingActive) {
    debugLog('[stopScanner] ZXing-js scanner is active, stopping it');
    if (window.ScannerZXing && window.ScannerZXing.stopZXingScanner) {
      window.ScannerZXing.stopZXingScanner();
    }
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
  console.log("[DEBUG] Button click details:", {
    scannerState: scannerState,
    scanner: !!scanner,
    zxingActive: window.zxingActive,
    animationFrameId: animationFrameId
  });
  debugLog('[handleScannerButtonClick] Button clicked, state:', scannerState);
  
  if (scannerState === 'idle') {
    scannerState = 'starting';
    debugLog('[handleScannerButtonClick] Starting scanner');
    startSmartScanner();
  } else if (scannerState === 'scanning') {
    debugLog('[handleScannerButtonClick] Stopping scanner');
    stopScanner();
  } else if (scannerState === 'starting') {
    debugLog('[handleScannerButtonClick] Scanner is starting, ignoring click');
    // Ignore clicks while starting to prevent conflicts
  } else if (scannerState === 'stopping') {
    debugLog('[handleScannerButtonClick] Scanner is stopping, ignoring click');
    // Ignore clicks while stopping to prevent conflicts
  } else {
    console.log("[DEBUG] Unknown scanner state:", scannerState);
    debugLog('[handleScannerButtonClick] Unknown state, resetting to idle');
    resetToIdle();
  }
}

/**
 * Debug log function for UI and console
 */
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

/**
 * Clear debug log function
 */
function clearDebugLog() {
  const debugContent = document.getElementById('debugContent');
  if (debugContent) {
    debugContent.innerHTML = '';
  }
}

// Export core scanner functions
window.ScannerCore = {
  startSmartScanner,
  stopScanner,
  handleScannerButtonClick,
  resetToIdle,
  debugLog,
  clearDebugLog,
  scannerState,
  scanner,
  videoStream,
  animationFrameId,
  lastScanTime,
  lastDetectedCode,
  detectionCount,
  scanAttempts,
  isCapacitor,
  isNative
};

// Initialize scanner state when module loads
document.addEventListener('DOMContentLoaded', function() {
  scannerState = 'idle';
  debugLog('[DOMContentLoaded] Scanner state initialized to idle');
}); 