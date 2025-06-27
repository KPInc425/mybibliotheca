/**
 * BookOracle Native Scanner Module
 * Handles native barcode scanning via Capacitor and MLKit
 */

/**
 * Start native scanner using Capacitor MLKit
 */
async function startNativeScanner() {
  console.log('[Native Scanner] Starting native barcode scanner...');
  console.log('[Native Scanner] Environment check:', {
    isCapacitor: window.isCapacitor,
    isNative: window.isNative,
    platform: window.platform,
    Capacitor: typeof Capacitor,
    CapacitorPlugins: window.isCapacitor ? Object.keys(Capacitor.Plugins || {}) : 'N/A',
    BarcodeScanner: window.isCapacitor ? !!Capacitor.Plugins.BarcodeScanner : 'N/A',
    CapacitorIsNative: window.isCapacitor ? Capacitor.isNative : 'N/A'
  });
  
  // Set scanner state to starting
  if (typeof scannerState !== 'undefined') {
    scannerState = 'starting';
    console.log('[Native Scanner] Set scanner state to starting');
  }
  
  // Check if Capacitor and BarcodeScanner are available
  if (!window.isCapacitor) {
    const errorMsg = 'Capacitor not available';
    console.error('[Native Scanner] Native scanner not available:', errorMsg);
    logScannerStatus('Native scanner not available', 'error');
    throw new Error('Native scanner not available');
  }
  
  if (!Capacitor.Plugins.BarcodeScanner) {
    const errorMsg = 'BarcodeScanner plugin not found';
    console.error('[Native Scanner] Native scanner not available:', errorMsg);
    console.log('[Native Scanner] Available plugins:', Object.keys(Capacitor.Plugins || {}));
    logScannerStatus('Native scanner not available', 'error');
    throw new Error('Native scanner not available');
  }
  
  const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
  const platform = Capacitor.getPlatform();
  
  console.log('[Native Scanner] Platform detected:', platform);
  console.log('[Native Scanner] Capacitor.isNative:', Capacitor.isNative);
  
  // Check if we're actually on a native platform
  if (platform === 'web') {
    console.log('[Native Scanner] Running on web platform, native scanner not available');
    logScannerStatus('Native scanner not available on web platform', 'error');
    throw new Error('Native scanner not available on web platform');
  }
  
  // Check if scanning is supported
  try {
    console.log('[Native Scanner] Checking if barcode scanning is supported...');
    const { supported } = await BarcodeScanner.isSupported();
    console.log('[Native Scanner] Barcode scanning supported:', supported);
    
    if (!supported) {
      const errorMsg = 'Barcode scanning not supported on this device';
      console.error('[Native Scanner] Native scanner not available:', errorMsg);
      logScannerStatus('Native scanner not available', 'error');
      throw new Error('Native scanner not available');
    }
  } catch (supportError) {
    console.error('[Native Scanner] Error checking support:', supportError);
    logScannerStatus('Error checking scanner support', 'error');
    throw supportError;
  }
  
  // Check permissions
  let permissionGranted = false;
  try {
    console.log('[Native Scanner] Checking camera permissions...');
    const { granted } = await BarcodeScanner.checkPermissions();
    console.log(`[Native Scanner] Initial permission status: ${granted ? 'granted' : 'denied'}`);
    logScannerStatus(`Permission status: ${granted ? 'granted' : 'denied'}`, granted ? 'success' : 'warning');
    permissionGranted = granted;
  } catch (permError) {
    console.log(`[Native Scanner] Permission check error: ${permError.message}`, 'warning');
    logScannerStatus(`Permission check error: ${permError.message}`, 'warning');
  }
  
  if (!permissionGranted) {
    console.log('[Native Scanner] Permission not granted, attempting to request...');
    logScannerStatus('Requesting camera permissions...', 'info');
    try {
      const { granted: newGranted } = await BarcodeScanner.requestPermissions();
      console.log(`[Native Scanner] Permission request result: ${newGranted ? 'granted' : 'denied'}`);
      logScannerStatus(`Permission request result: ${newGranted ? 'granted' : 'denied'}`, newGranted ? 'success' : 'error');
      permissionGranted = newGranted;
    } catch (permError) {
      console.log(`[Native Scanner] Permission request error: ${permError.message}`, 'warning');
      logScannerStatus(`Permission request error: ${permError.message}`, 'error');
    }
  }
  
  // Try to start scanning even if permissions appear denied
  console.log('[Native Scanner] Attempting to start barcode scan...');
  logScannerStatus('Starting native barcode scan...', 'info');
  
  // Set scanner state to scanning
  if (typeof scannerState !== 'undefined') {
    scannerState = 'scanning';
    console.log('[Native Scanner] Set scanner state to scanning');
  }
  
  try {
    const { barcodes } = await BarcodeScanner.scan();
    
    if (barcodes && barcodes.length > 0) {
      const barcode = barcodes[0];
      console.log(`[Native Scanner] Barcode detected: ${barcode.rawValue} (${barcode.format})`);
      logScannerStatus(`✅ Barcode detected: ${barcode.rawValue}`, 'success');
      
      // Fill in the ISBN field
      const isbnField = document.getElementById('isbn');
      if (isbnField) {
        isbnField.value = barcode.rawValue;
        isbnField.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('[Native Scanner] ISBN field updated with scanned barcode');
        logScannerStatus('ISBN field updated with scanned barcode', 'success');
      }
      
      // Auto-fetch book data after successful scan
      console.log('[Native Scanner] Auto-fetching book data...');
      logScannerStatus('Auto-fetching book data...', 'info');
      console.log('[Native Scanner] Debug info:', {
        debugEnabled: window.debugEnabled,
        handleSuccessfulScan: typeof window.handleSuccessfulScan,
        autofetchBookData: typeof window.autofetchBookData,
        ScannerModule: typeof window.ScannerModule
      });
      
      if (window.debugEnabled) {
        console.log('[Native Scanner] Debug mode enabled - auto-fetch skipped');
        logScannerStatus('Debug mode enabled - auto-fetch skipped. Click "Fetch Book Data" manually when ready.', 'info');
      } else if (window.handleSuccessfulScan) {
        console.log('[Native Scanner] Calling handleSuccessfulScan with code:', barcode.rawValue);
        logScannerStatus('Calling handleSuccessfulScan for unified behavior', 'success');
        window.handleSuccessfulScan(barcode.rawValue);
      } else if (window.autofetchBookData) {
        console.log('[Native Scanner] Calling autofetchBookData directly');
        logScannerStatus('Calling autofetchBookData directly (fallback)', 'success');
        window.autofetchBookData();
      } else {
        console.log('[Native Scanner] No autofetch functions available');
        logScannerStatus('No autofetch function found - please click "Fetch Book Data" manually', 'warning');
        console.log('[Native Scanner] Available functions:', {
          handleSuccessfulScan: typeof window.handleSuccessfulScan,
          autofetchBookData: typeof window.autofetchBookData,
          ScannerModule: typeof window.ScannerModule
        });
      }
    } else {
      console.log('[Native Scanner] No barcode detected');
      logScannerStatus('No barcode detected', 'info');
    }
    
  } catch (error) {
    // Check if this is a user cancellation
    const errorMessage = error.message || error.toString();
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
      console.log('[Native Scanner] Scan cancelled by user');
      logScannerStatus('Scan cancelled by user', 'info');
      // Don't throw error for cancellation - just return normally
      return;
    } else {
      console.error('[Native Scanner] Scan error:', error);
      logScannerStatus(`Native scanner error: ${error.message}`, 'error');
      
      // Check if it's a permission error
      if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        console.log('[Native Scanner] Permission error detected');
        logScannerStatus('Camera permission error during scanning. Please check device settings.', 'error');
        // Don't throw here, let the user know about the permission issue
        return;
      } else {
        throw error; // Re-throw actual errors to trigger fallback
      }
    }
  }
  
  // Always reset scanner state to idle after completion
  if (typeof scannerState !== 'undefined') {
    scannerState = 'idle';
    console.log('[Native Scanner] Reset scanner state to idle');
  }
}

/**
 * Log scanner status with formatting
 */
function logScannerStatus(message, type = 'info') {
  console.log(`[Native Scanner] ${message}`);
  
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
        <h4 style="color: ${color.text}; margin-bottom: 10px;">📱 Native Scanner</h4>
        <p style="margin-bottom: 15px;">
          ${message}
        </p>
      </div>
    `;
    statusDiv.style.background = color.bg;
    statusDiv.style.border = `2px solid ${color.border}`;
    statusDiv.style.borderRadius = '10px';
    statusDiv.style.color = '#333';
    statusDiv.style.display = 'block';
  }
}

/**
 * Check if native scanner is available
 */
function isNativeScannerAvailable() {
  const available = window.isCapacitor && 
                   window.platform !== 'web' && 
                   Capacitor.Plugins.BarcodeScanner;
  
  console.log('[Native Scanner] Availability check:', {
    available,
    isCapacitor: window.isCapacitor,
    platform: window.platform,
    hasBarcodeScanner: window.isCapacitor ? !!Capacitor.Plugins.BarcodeScanner : false
  });
  
  return available;
}

/**
 * Get native scanner capabilities
 */
async function getNativeScannerCapabilities() {
  if (!isNativeScannerAvailable()) {
    return { available: false, reason: 'Capacitor or BarcodeScanner plugin not available' };
  }
  
  try {
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
    const { supported } = await BarcodeScanner.isSupported();
    
    if (!supported) {
      return { available: false, reason: 'Barcode scanning not supported on this device' };
    }
    
    // Check permissions
    let permissions = 'unknown';
    try {
      const { granted } = await BarcodeScanner.checkPermissions();
      permissions = granted ? 'granted' : 'denied';
    } catch (error) {
      permissions = 'error';
    }
    
    return {
      available: true,
      supported: true,
      permissions: permissions,
      plugin: 'MLKit Barcode Scanner'
    };
    
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

/**
 * Test native scanner functionality
 */
async function testNativeScanner() {
  console.log('Testing native scanner...');
  
  const capabilities = await getNativeScannerCapabilities();
  console.log('Native scanner capabilities:', capabilities);
  
  if (!capabilities.available) {
    console.log('Native scanner not available:', capabilities.reason);
    return false;
  }
  
  try {
    // Try a quick scan test
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
    const { barcodes } = await BarcodeScanner.scan();
    
    console.log('Native scanner test successful');
    return true;
    
  } catch (error) {
    console.log('Native scanner test failed:', error.message);
    return false;
  }
}

/**
 * Simple test function for debugging
 */
async function debugNativeScanner() {
  console.log('[Native Scanner] Debug function called');
  
  if (!window.isCapacitor) {
    console.log('[Native Scanner] Capacitor not available');
    return { available: false, reason: 'Capacitor not available' };
  }
  
  if (!Capacitor.Plugins.BarcodeScanner) {
    console.log('[Native Scanner] BarcodeScanner plugin not found');
    return { available: false, reason: 'BarcodeScanner plugin not found' };
  }
  
  const platform = Capacitor.getPlatform();
  console.log('[Native Scanner] Platform:', platform);
  
  if (platform === 'web') {
    console.log('[Native Scanner] Running on web platform');
    return { available: false, reason: 'Running on web platform' };
  }
  
  try {
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
    const { supported } = await BarcodeScanner.isSupported();
    console.log('[Native Scanner] Supported:', supported);
    
    if (!supported) {
      return { available: false, reason: 'Barcode scanning not supported' };
    }
    
    return { available: true, platform, supported };
    
  } catch (error) {
    console.log('[Native Scanner] Error checking support:', error.message);
    return { available: false, reason: error.message };
  }
}

/**
 * Request camera permissions directly
 */
async function requestCameraPermissions() {
  console.log('[Native Scanner] Requesting camera permissions directly...');
  
  if (!window.isCapacitor) {
    console.error('[Native Scanner] Capacitor not available');
    throw new Error('Capacitor not available');
  }
  
  const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
  if (!BarcodeScanner) {
    console.error('[Native Scanner] BarcodeScanner plugin not found');
    throw new Error('BarcodeScanner plugin not found');
  }
  
  try {
    // Check if scanning is supported
    const { supported } = await BarcodeScanner.isSupported();
    console.log('[Native Scanner] Barcode scanning supported:', supported);
    
    if (!supported) {
      throw new Error('Barcode scanning not supported on this device');
    }
    
    // Request permissions directly
    console.log('[Native Scanner] Requesting camera permissions...');
    const { granted } = await BarcodeScanner.requestPermissions();
    console.log(`[Native Scanner] Permission request result: ${granted ? 'GRANTED' : 'DENIED'}`);
    
    if (granted) {
      console.log('[Native Scanner] Camera permissions granted successfully!');
      return { success: true, granted: true };
    } else {
      console.log('[Native Scanner] Camera permissions denied');
      return { success: false, granted: false, reason: 'Permission denied' };
    }
    
  } catch (error) {
    console.error('[Native Scanner] Permission request error:', error);
    return { success: false, granted: false, reason: error.message };
  }
}

// Export functions for use in other modules
window.NativeScanner = {
  startNativeScanner,
  logScannerStatus,
  isNativeScannerAvailable,
  getNativeScannerCapabilities,
  testNativeScanner,
  debugNativeScanner,
  requestCameraPermissions
}; 