/**
 * BookOracle Native Scanner Module
 * Handles native barcode scanning via Capacitor and MLKit
 */

/**
 * Request camera permissions early and proactively
 */
async function requestCameraPermissionsEarly() {
  try {
    console.log('[Native Scanner] === REQUESTING CAMERA PERMISSIONS EARLY ===');
    
    if (!window.isCapacitor) {
      console.log('[Native Scanner] Not in Capacitor environment, skipping early permission request');
      return;
    }
    
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
    if (!BarcodeScanner) {
      console.log('[Native Scanner] BarcodeScanner plugin not available for early permission request');
      return;
    }
    
    console.log('[Native Scanner] BarcodeScanner plugin found, checking current permissions...');
    
    // Check if scanning is supported
    const { supported } = await BarcodeScanner.isSupported();
    console.log(`[Native Scanner] Barcode scanning supported: ${supported}`);
    
    if (!supported) {
      console.log('[Native Scanner] Barcode scanning not supported on this device');
      return;
    }
    
    // Check current permissions with retry logic
    let permissionGranted = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !permissionGranted) {
      try {
        const { granted } = await BarcodeScanner.checkPermissions();
        console.log(`[Native Scanner] Permission check attempt ${retryCount + 1}: ${granted ? 'GRANTED' : 'DENIED'}`);
        
        if (granted) {
          permissionGranted = true;
          console.log('[Native Scanner] ✅ Camera permissions confirmed as granted', 'success');
          // Don't show status message if permissions are already granted
          return;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`[Native Scanner] Permission not granted, waiting 1 second before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`[Native Scanner] Permission check error on attempt ${retryCount + 1}: ${error.message}`, 'error');
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!permissionGranted) {
      console.log('[Native Scanner] Permission not granted after retries, requesting permissions...');
      
      // Request permissions automatically
      console.log('[Native Scanner] Requesting camera permissions automatically...');
      const { granted: newGranted } = await BarcodeScanner.requestPermissions();
      console.log(`[Native Scanner] Early permission request result: ${newGranted ? 'GRANTED' : 'DENIED'}`);
      
      if (newGranted) {
        console.log('[Native Scanner] ✅ Camera permissions granted successfully during early request!', 'success');
        // Don't show status message if permissions are granted
      } else {
        console.log('[Native Scanner] ❌ Camera permissions denied during early request', 'error');
        // Don't show status message for early permission requests - let the user try scanning first
      }
    }
    
  } catch (error) {
    console.log(`[Native Scanner] Early permission request error: ${error.message}`, 'error');
  }
}

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
  
  // Check if Google Barcode Scanner Module is available
  console.log('[Native Scanner] Checking Google Barcode Scanner Module availability...');
  const moduleCheck = await checkBarcodeScannerModule();
  console.log('[Native Scanner] Module check result:', moduleCheck);
  
  if (!moduleCheck.available) {
    if (moduleCheck.needsInstallation) {
      console.log('[Native Scanner] Google Barcode Scanner Module needs to be installed');
      logScannerStatus('Installing barcode scanner module...', 'info');
      
      // Show user-friendly message about the installation
      if (window.ScannerUI && window.ScannerUI.showNotification) {
        window.ScannerUI.showNotification(
          'Installing barcode scanner module for better compatibility...',
          'info'
        );
      }
      
      try {
        await installBarcodeScannerModule();
        console.log('[Native Scanner] Module installation successful, retrying...');
        logScannerStatus('Module installed successfully, retrying...', 'success');
        
        // Show success message
        if (window.ScannerUI && window.ScannerUI.showNotification) {
          window.ScannerUI.showNotification(
            'Barcode scanner module installed successfully!',
            'success'
          );
        }
      } catch (installError) {
        console.error('[Native Scanner] Module installation failed:', installError);
        logScannerStatus('Module installation failed - app update may be required', 'error');
        
        // Show user-friendly error message
        if (window.ScannerUI && window.ScannerUI.showNotification) {
          window.ScannerUI.showNotification(
            'Unable to install barcode scanner module. Please try updating the app or contact support.',
            'error'
          );
        }
        
        throw new Error('Scanner module installation failed - app update required');
      }
    } else {
      const errorMsg = `Scanner module not available: ${moduleCheck.reason}`;
      console.error('[Native Scanner] Native scanner not available:', errorMsg);
      logScannerStatus('Native scanner not available', 'error');
      throw new Error('Native scanner not available');
    }
  }
  
  console.log('[Native Scanner] Starting native scanner - checking permissions first...');
  logScannerStatus('Checking camera permissions...', 'info');
  
  // Check and request permissions before starting scanner
  let permissionGranted = false;
  let retryCount = 0;
  const maxRetries = 3;
  
  // First, check current permissions
  try {
    const { granted } = await BarcodeScanner.checkPermissions();
    console.log(`[Native Scanner] Initial permission status: ${granted ? 'granted' : 'denied'}`);
    permissionGranted = granted;
  } catch (permError) {
    console.log(`[Native Scanner] Permission check error: ${permError.message}`, 'warning');
  }
  
  // If permissions are not granted, request them BEFORE attempting to scan
  if (!permissionGranted) {
    console.log('[Native Scanner] Permission not granted, requesting permissions...');
    logScannerStatus('Requesting camera permissions...', 'info');
    
    try {
      const { granted: newGranted } = await BarcodeScanner.requestPermissions();
      console.log(`[Native Scanner] Permission request result: ${newGranted ? 'granted' : 'denied'}`);
      permissionGranted = newGranted;
      
      // If the permission request returned granted, we can proceed
      if (permissionGranted) {
        console.log('[Native Scanner] Permission granted during request, proceeding...');
      } else {
        // If permission request returned denied, try checking again with retries
        // This handles cases where the system hasn't updated the permission status yet
        console.log('[Native Scanner] Permission request returned denied, checking again with retries...');
        
        while (retryCount < maxRetries && !permissionGranted) {
          retryCount++;
          console.log(`[Native Scanner] Permission check retry ${retryCount}/${maxRetries}...`);
          
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const { granted: retryGranted } = await BarcodeScanner.checkPermissions();
            console.log(`[Native Scanner] Retry ${retryCount} permission status: ${retryGranted ? 'granted' : 'denied'}`);
            
            if (retryGranted) {
              permissionGranted = true;
              console.log('[Native Scanner] Permission confirmed granted on retry!');
              break;
            }
          } catch (retryError) {
            console.log(`[Native Scanner] Retry ${retryCount} permission check error: ${retryError.message}`, 'warning');
          }
        }
        
        // If still not granted after retries, then it's truly denied
        if (!permissionGranted) {
          const errorMsg = 'Camera permissions denied';
          console.error('[Native Scanner] Permission denied after retries:', errorMsg);
          logScannerStatus('Camera permissions denied', 'error');
          throw new Error('Camera permissions denied');
        }
      }
    } catch (permError) {
      console.error('[Native Scanner] Permission request error:', permError);
      logScannerStatus('Camera permission request failed', 'error');
      throw new Error('Camera permission request failed');
    }
  }
  
  // Final verification that permissions are granted
  if (permissionGranted) {
    console.log('[Native Scanner] Permissions confirmed granted, proceeding with scanner...');
    logScannerStatus('Camera permissions confirmed, starting scanner...', 'success');
  } else {
    // This should not happen if our logic is correct, but just in case
    const errorMsg = 'Camera permissions not available';
    console.error('[Native Scanner] Final permission check failed:', errorMsg);
    logScannerStatus('Camera permissions not available', 'error');
    throw new Error('Camera permissions not available');
  }
  
  console.log('[Native Scanner] Permissions verified, starting native scanner...');
  logScannerStatus('Starting native scanner...', 'info');
  
  // Set scanner state to scanning
  if (typeof scannerState !== 'undefined') {
    scannerState = 'scanning';
    console.log('[Native Scanner] Set scanner state to scanning');
  }
  
  // Add a small delay to ensure any permission dialogs have completed
  await new Promise(resolve => setTimeout(resolve, 500));
  
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
      
      // Try to auto-fetch book data
      if (window.autofetchBookData) {
        try {
          await window.autofetchBookData(barcode.rawValue);
          console.log('[Native Scanner] Auto-fetch completed successfully');
          logScannerStatus('Book data fetched successfully!', 'success');
        } catch (fetchError) {
          console.log('[Native Scanner] Auto-fetch failed:', fetchError.message);
          logScannerStatus('Auto-fetch failed, but barcode was scanned', 'warning');
        }
      } else if (window.handleSuccessfulScan) {
        try {
          window.handleSuccessfulScan(barcode.rawValue);
          console.log('[Native Scanner] handleSuccessfulScan called');
        } catch (scanError) {
          console.log('[Native Scanner] handleSuccessfulScan failed:', scanError.message);
        }
      } else {
        console.log('[Native Scanner] No auto-fetch function available');
      }
      
      return barcode.rawValue;
    } else {
      console.log('[Native Scanner] No barcode detected');
      logScannerStatus('No barcode detected', 'info');
      return null;
    }
  } catch (scanError) {
    console.error('[Native Scanner] Scan error:', scanError);
    
    // Handle specific error for Google Barcode Scanner Module
    if (scanError.message && scanError.message.includes('Google Barcode Scanner Module is not available')) {
      const errorMsg = 'Barcode scanner module needs to be installed. Please update the app or contact support.';
      console.error('[Native Scanner] Google Barcode Scanner Module not available:', errorMsg);
      logScannerStatus('Scanner module not available - app update may be required', 'error');
      
      // Show user-friendly error message
      if (window.ScannerUI && window.ScannerUI.showNotification) {
        window.ScannerUI.showNotification(
          'The barcode scanner module is not available on this device. Please try updating the app or contact support.',
          'error'
        );
      }
      
      throw new Error('Scanner module not available - app update required');
    }
    
    // Handle cancellation
    if (scanError.message && (
      scanError.message.includes('cancel') || 
      scanError.message.includes('Cancel') ||
      scanError.message.includes('User cancelled') ||
      scanError.message.includes('user cancelled') ||
      scanError.message.includes('cancelled') ||
      scanError.message.includes('Cancelled') ||
      scanError.message.includes('back') ||
      scanError.message.includes('Back') ||
      scanError.message.includes('dismiss') ||
      scanError.message.includes('Dismiss')
    )) {
      console.log('[Native Scanner] Scan cancelled by user');
      logScannerStatus('Scan cancelled', 'info');
      throw new Error('Scan cancelled by user');
    }
    
    // Generic error handling
    logScannerStatus(`Scan error: ${scanError.message}`, 'error');
    throw scanError;
  } finally {
    // Reset scanner state
    if (typeof scannerState !== 'undefined') {
      scannerState = 'idle';
      console.log('[Native Scanner] Reset scanner state to idle');
    }
  }
}

/**
 * Log scanner status messages
 */
function logScannerStatus(message, type = 'info') {
  console.log(`[Native Scanner] ${message}`);
  
  // Update UI if ScannerUI is available
  if (window.ScannerUI && window.ScannerUI.updateScannerStatus) {
    window.ScannerUI.updateScannerStatus(message, type);
  }
  
  // Show notification for important messages
  if (window.ScannerUI && window.ScannerUI.showNotification) {
    if (type === 'error') {
      window.ScannerUI.showNotification(message, 'error');
    } else if (type === 'success') {
      window.ScannerUI.showNotification(message, 'success');
    }
  }
}

/**
 * Check if native scanner is available
 */
function isNativeScannerAvailable() {
  return window.isCapacitor && 
         window.platform !== 'web' && 
         typeof Capacitor !== 'undefined' && 
         Capacitor.Plugins && 
         Capacitor.Plugins.BarcodeScanner;
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
  console.log('[Native Scanner] Testing native scanner...');
  
  try {
    const capabilities = await getNativeScannerCapabilities();
    console.log('[Native Scanner] Scanner capabilities:', capabilities);
    
    if (!capabilities.available) {
      throw new Error(capabilities.reason);
    }
    
    console.log('[Native Scanner] Native scanner test passed');
    return { success: true, capabilities };
    
  } catch (error) {
    console.error('[Native Scanner] Native scanner test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Debug native scanner
 */
async function debugNativeScanner() {
  console.log('[Native Scanner] === NATIVE SCANNER DEBUG ===');
  
  const debugInfo = {
    isCapacitor: window.isCapacitor,
    isNative: window.isNative,
    platform: window.platform,
    Capacitor: typeof Capacitor,
    CapacitorPlugins: window.isCapacitor ? Object.keys(Capacitor.Plugins || {}) : 'N/A',
    BarcodeScanner: window.isCapacitor ? !!Capacitor.Plugins.BarcodeScanner : 'N/A'
  };
  
  console.log('[Native Scanner] Debug info:', debugInfo);
  
  if (window.isCapacitor && Capacitor.Plugins.BarcodeScanner) {
    try {
      const { supported } = await Capacitor.Plugins.BarcodeScanner.isSupported();
      debugInfo.supported = supported;
      console.log('[Native Scanner] Barcode scanning supported:', supported);
      
      if (supported) {
        const { granted } = await Capacitor.Plugins.BarcodeScanner.checkPermissions();
        debugInfo.permissions = granted ? 'granted' : 'denied';
        console.log('[Native Scanner] Camera permissions:', debugInfo.permissions);
      }
    } catch (error) {
      debugInfo.error = error.message;
      console.error('[Native Scanner] Debug error:', error);
    }
  }
  
  return debugInfo;
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

/**
 * Stop native scanner
 */
async function stopNativeScanner() {
  console.log('[Native Scanner] Stopping native scanner...');
  
  const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
  if (!BarcodeScanner) {
    console.log('[Native Scanner] BarcodeScanner plugin not available for stopping');
    return;
  }
  
  try {
    // The MLKit BarcodeScanner plugin doesn't have a stop method,
    // but we can try to close any active scanning session
    console.log('[Native Scanner] Native scanner stop requested (MLKit handles this automatically)');
    
    // Reset scanner state
    if (typeof scannerState !== 'undefined') {
      scannerState = 'idle';
      console.log('[Native Scanner] Reset scanner state to idle');
    }
    
    // Update UI
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerButton(false);
      window.ScannerUI.hideScannerViewport();
      window.ScannerUI.hideScannerStatus();
    }
    
    console.log('[Native Scanner] Native scanner stopped successfully');
    
  } catch (error) {
    console.error('[Native Scanner] Error stopping native scanner:', error);
    // Don't throw error, just log it
  }
}

/**
 * Check if Google Barcode Scanner Module is available
 */
async function checkBarcodeScannerModule() {
  if (!window.isCapacitor || !Capacitor.Plugins.BarcodeScanner) {
    return { available: false, reason: 'BarcodeScanner plugin not available' };
  }
  
  try {
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
    
    // First check if scanning is supported
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) {
      return { available: false, reason: 'Barcode scanning not supported on this device' };
    }
    
    // Try to check permissions as a way to test if the module is properly installed
    try {
      await BarcodeScanner.checkPermissions();
      return { available: true, reason: 'Module appears to be available' };
    } catch (permError) {
      // If we get a specific error about the module not being available, return that
      if (permError.message && permError.message.includes('Google Barcode Scanner Module is not available')) {
        return { 
          available: false, 
          reason: 'Google Barcode Scanner Module needs to be installed',
          needsInstallation: true 
        };
      }
      // Other permission errors are normal and don't indicate module unavailability
      return { available: true, reason: 'Module available (permission check failed but that\'s normal)' };
    }
    
  } catch (error) {
    if (error.message && error.message.includes('Google Barcode Scanner Module is not available')) {
      return { 
        available: false, 
        reason: 'Google Barcode Scanner Module needs to be installed',
        needsInstallation: true 
      };
    }
    return { available: false, reason: error.message };
  }
}

/**
 * Install Google Barcode Scanner Module (if supported)
 */
async function installBarcodeScannerModule() {
  if (!window.isCapacitor || !Capacitor.Plugins.BarcodeScanner) {
    throw new Error('BarcodeScanner plugin not available');
  }
  
  try {
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
    
    // Check if the install method is available
    if (typeof BarcodeScanner.installGoogleBarcodeScannerModule === 'function') {
      console.log('[Native Scanner] Installing Google Barcode Scanner Module...');
      await BarcodeScanner.installGoogleBarcodeScannerModule();
      console.log('[Native Scanner] Google Barcode Scanner Module installation completed');
      return { success: true, message: 'Module installed successfully' };
    } else {
      throw new Error('Install method not available on this device');
    }
  } catch (error) {
    console.error('[Native Scanner] Failed to install Google Barcode Scanner Module:', error);
    throw error;
  }
}

/**
 * Debug Google Barcode Scanner Module status
 */
async function debugBarcodeScannerModule() {
  console.log('[Native Scanner] === DEBUGGING BARCODE SCANNER MODULE ===');
  
  if (!window.isCapacitor) {
    console.log('[Native Scanner] Not in Capacitor environment');
    return { available: false, reason: 'Not in Capacitor environment' };
  }
  
  if (!Capacitor.Plugins.BarcodeScanner) {
    console.log('[Native Scanner] BarcodeScanner plugin not found');
    return { available: false, reason: 'BarcodeScanner plugin not found' };
  }
  
  const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;
  const debugInfo = {
    pluginAvailable: true,
    pluginMethods: Object.keys(BarcodeScanner),
    hasInstallMethod: typeof BarcodeScanner.installGoogleBarcodeScannerModule === 'function',
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNative
  };
  
  console.log('[Native Scanner] Debug info:', debugInfo);
  
  try {
    // Check if scanning is supported
    const { supported } = await BarcodeScanner.isSupported();
    debugInfo.supported = supported;
    console.log('[Native Scanner] Barcode scanning supported:', supported);
    
    if (!supported) {
      return { available: false, reason: 'Barcode scanning not supported on this device', debugInfo };
    }
    
    // Try to check permissions
    try {
      const { granted } = await BarcodeScanner.checkPermissions();
      debugInfo.permissionsGranted = granted;
      console.log('[Native Scanner] Permissions granted:', granted);
    } catch (permError) {
      debugInfo.permissionError = permError.message;
      console.log('[Native Scanner] Permission check error:', permError.message);
      
      if (permError.message.includes('Google Barcode Scanner Module is not available')) {
        debugInfo.moduleNotAvailable = true;
        return { 
          available: false, 
          reason: 'Google Barcode Scanner Module needs to be installed',
          needsInstallation: true,
          debugInfo 
        };
      }
    }
    
    return { available: true, reason: 'Module appears to be working', debugInfo };
    
  } catch (error) {
    debugInfo.error = error.message;
    console.error('[Native Scanner] Debug error:', error);
    
    if (error.message.includes('Google Barcode Scanner Module is not available')) {
      debugInfo.moduleNotAvailable = true;
      return { 
        available: false, 
        reason: 'Google Barcode Scanner Module needs to be installed',
        needsInstallation: true,
        debugInfo 
      };
    }
    
    return { available: false, reason: error.message, debugInfo };
  }
}

// Export functions for use in other modules
window.NativeScanner = {
  startNativeScanner,
  stopNativeScanner,
  logScannerStatus,
  isNativeScannerAvailable,
  getNativeScannerCapabilities,
  testNativeScanner,
  debugNativeScanner,
  requestCameraPermissions,
  requestCameraPermissionsEarly,
  checkBarcodeScannerModule,
  installBarcodeScannerModule,
  debugBarcodeScannerModule
};
