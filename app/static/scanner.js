/**
 * BookOracle Barcode Scanner Module
 * Main coordinator for all scanner functionality
 * 
 * This module coordinates between:
 * - ScannerCore: State management and orchestration
 * - ScannerZXing: ZXing-js browser scanning
 * - ScannerUI: UI operations and notifications
 * - ScannerData: Book data fetching
 * - ScannerUtils: Utility functions and detection
 * - NativeScanner: Native Capacitor scanning
 */

/**
 * Import functions from other modules when they're available
 */
function importModuleFunctions() {
  // Import from ScannerCore
  if (window.ScannerCore) {
    window.startSmartScanner = window.ScannerCore.startSmartScanner;
    window.stopScanner = window.ScannerCore.stopScanner;
    window.handleScannerButtonClick = window.ScannerCore.handleScannerButtonClick;
    window.resetToIdle = window.ScannerCore.resetToIdle;
    window.handleScanDetection = window.ScannerCore.handleScanDetection;
    window.handleScanError = window.ScannerCore.handleScanError;
  }
  
  // Import from ScannerZXing (only if loaded)
  if (window.ScannerZXing) {
    window.startBrowserScanner = window.ScannerZXing.startBrowserScanner;
    window.stopBrowserScanner = window.ScannerZXing.stopBrowserScanner;
    window.isBrowserScannerAvailable = window.ScannerZXing.isBrowserScannerAvailable;
    console.log('[Scanner] ZXing scanner module imported');
  } else {
    console.log('[Scanner] ZXing scanner module not loaded (native scanner available)');
  }
  
  // Import from ScannerUI
  if (window.ScannerUI) {
    window.showNotification = window.ScannerUI.showNotification;
    window.updateScannerStatus = window.ScannerUI.updateScannerStatus;
    window.hideScannerStatus = window.ScannerUI.hideScannerStatus;
    window.updateScannerButton = window.ScannerUI.updateScannerButton;
    window.showScannerViewport = window.ScannerUI.showScannerViewport;
    window.hideScannerViewport = window.ScannerUI.hideScannerViewport;
    window.updateBookCover = window.ScannerUI.updateBookCover;
    window.fillBookForm = window.ScannerUI.fillBookForm;
    window.showFetchLoading = window.ScannerUI.showFetchLoading;
    window.resetFetchButton = window.ScannerUI.resetFetchButton;
  }
  
  // Import from ScannerData
  if (window.ScannerData) {
    window.autofetchBookData = window.ScannerData.autofetchBookData;
    window.handleSuccessfulScan = window.ScannerData.handleSuccessfulScan;
    window.handleScanError = window.ScannerData.handleScanError;
  }
  
  // Import from ScannerUtils (fallback implementations)
  if (window.ScannerUtils) {
    // These are already available from ScannerUtils
    console.log('ScannerUtils loaded - using utility functions');
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
  }
  
  // Import from NativeScanner
  if (window.NativeScanner) {
    window.startNativeScanner = window.NativeScanner.startNativeScanner;
    window.stopNativeScanner = window.NativeScanner.stopNativeScanner;
  }
}

/**
 * Initialize scanner system
 */
function initializeScanner() {
  // Import functions from modules
  importModuleFunctions();
  
  // Setup mobile optimizations
  if (window.ScannerUI && window.ScannerUI.setupMobileOptimizations) {
    window.ScannerUI.setupMobileOptimizations();
  }
  
  // Initialize data module
  if (window.ScannerData && window.ScannerData.initializeDataModule) {
    window.ScannerData.initializeDataModule();
  }
  
  // Check scanner availability
  const isAvailable = window.ScannerCore && window.ScannerCore.isScannerAvailable();
  
  if (!isAvailable) {
    console.warn('No scanner available - native or browser scanner not detected');
  }
}

/**
 * Get scanner system status
 */
function getScannerSystemStatus() {
  return {
    core: window.ScannerCore ? window.ScannerCore.getScannerState() : 'unavailable',
    native: window.NativeScanner ? 'available' : 'unavailable',
    browser: window.ScannerZXing ? window.ScannerZXing.getBrowserScannerStatus() : 'not loaded',
    ui: window.ScannerUI ? 'available' : 'unavailable',
    data: window.ScannerData ? 'available' : 'unavailable'
  };
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScanner);
} else {
  initializeScanner();
}

// Export main scanner functions
window.Scanner = {
  initializeScanner,
  importModuleFunctions,
  getScannerSystemStatus
}; 