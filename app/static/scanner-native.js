/**
 * BookOracle Native Scanner Module
 * Handles native barcode scanning via Capacitor and MLKit
 */

/**
 * Start native scanner using Capacitor MLKit
 */
async function startNativeScanner() {
  console.log('[Native Scanner] Starting native barcode scanner...');
  
  // Set scanner state to starting
  if (typeof scannerState !== 'undefined') {
    scannerState = 'starting';
    console.log('[Native Scanner] Set scanner state to starting');
  }
  
  // Check if Capacitor and BarcodeScanner are available
  if (!isCapacitor || !Capacitor.Plugins.BarcodeScanner) {
    logScannerStatus('Native scanner not available', 'error');
    throw new Error('Native scanner not available');
  }
  
  const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
  
  // Check permissions
  let permissionGranted = false;
  try {
    const { granted } = await BarcodeScanner.checkPermissions();
    logScannerStatus(`Permission status: ${granted ? 'granted' : 'denied'}`, granted ? 'success' : 'warning');
    permissionGranted = granted;
  } catch (permError) {
    logScannerStatus(`Permission check error: ${permError.message}`, 'warning');
  }
  
  if (!permissionGranted) {
    logScannerStatus('Requesting camera permissions...', 'info');
    try {
      const { granted: newGranted } = await BarcodeScanner.requestPermissions();
      logScannerStatus(`Permission request result: ${newGranted ? 'granted' : 'denied'}`, newGranted ? 'success' : 'error');
      permissionGranted = newGranted;
    } catch (permError) {
      logScannerStatus(`Permission request error: ${permError.message}`, 'error');
    }
  }
  
  // Try to start scanning even if permissions appear denied
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
      logScannerStatus(`✅ Barcode detected: ${barcode.rawValue}`, 'success');
      
      // Fill in the ISBN field
      const isbnField = document.getElementById('isbn');
      if (isbnField) {
        isbnField.value = barcode.rawValue;
        isbnField.dispatchEvent(new Event('input', { bubbles: true }));
        logScannerStatus('ISBN field updated with scanned barcode', 'success');
      }
      
      // Auto-fetch book data after successful scan
      logScannerStatus('Auto-fetching book data...', 'info');
      console.log('[Native Scanner] Debug info:', {
        debugEnabled: window.debugEnabled,
        handleSuccessfulScan: typeof window.handleSuccessfulScan,
        autofetchBookData: typeof window.autofetchBookData,
        ScannerModule: typeof window.ScannerModule
      });
      
      if (window.debugEnabled) {
        logScannerStatus('Debug mode enabled - auto-fetch skipped. Click "Fetch Book Data" manually when ready.', 'info');
      } else if (window.handleSuccessfulScan) {
        logScannerStatus('Calling handleSuccessfulScan for unified behavior', 'success');
        console.log('[Native Scanner] Calling handleSuccessfulScan with code:', barcode.rawValue);
        window.handleSuccessfulScan(barcode.rawValue);
      } else if (window.autofetchBookData) {
        logScannerStatus('Calling autofetchBookData directly (fallback)', 'success');
        console.log('[Native Scanner] Calling autofetchBookData directly');
        window.autofetchBookData();
      } else {
        logScannerStatus('No autofetch function found - please click "Fetch Book Data" manually', 'warning');
        console.log('[Native Scanner] No autofetch functions available');
        console.log('[Native Scanner] Available functions:', {
          handleSuccessfulScan: typeof window.handleSuccessfulScan,
          autofetchBookData: typeof window.autofetchBookData,
          ScannerModule: typeof window.ScannerModule
        });
      }
    } else {
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
      logScannerStatus('Scan cancelled by user', 'info');
      // Don't throw error for cancellation - just return normally
      return;
    } else {
      logScannerStatus(`Native scanner error: ${error.message}`, 'error');
      throw error; // Re-throw actual errors to trigger fallback
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
  return isCapacitor && Capacitor.Plugins.BarcodeScanner;
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

// Export functions for use in other modules
window.NativeScanner = {
  startNativeScanner,
  logScannerStatus,
  isNativeScannerAvailable,
  getNativeScannerCapabilities,
  testNativeScanner
}; 