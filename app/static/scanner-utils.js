/**
 * MyBibliotheca Scanner Utilities
 * Helper functions and detection algorithms for barcode scanning
 */

/**
 * Enhanced barcode detection with multiple algorithms
 */
function enhancedBarcodeDetection(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Algorithm 1: Edge density analysis
  const edgeDensity = analyzeEdgeDensity(data, width, height);
  
  // Algorithm 2: Line pattern detection
  const linePatterns = detectLinePatterns(data, width, height);
  
  // Algorithm 3: Contrast analysis
  const contrastAnalysis = analyzeContrast(data, width, height);
  
  // Algorithm 4: Barcode-like structure detection
  const structureAnalysis = detectBarcodeStructure(data, width, height);
  
  // Combine results for final decision
  const confidence = (
    edgeDensity.confidence * 0.3 +
    linePatterns.confidence * 0.3 +
    contrastAnalysis.confidence * 0.2 +
    structureAnalysis.confidence * 0.2
  );
  
  const detected = confidence > 0.6; // Threshold for detection
  
  return {
    detected,
    confidence,
    region: detected ? {
      x: Math.min(edgeDensity.region.x, linePatterns.region.x),
      y: Math.min(edgeDensity.region.y, linePatterns.region.y),
      width: Math.max(edgeDensity.region.width, linePatterns.region.width),
      height: Math.max(edgeDensity.region.height, linePatterns.region.height)
    } : null,
    details: {
      edgeDensity,
      linePatterns,
      contrastAnalysis,
      structureAnalysis
    }
  };
}

/**
 * Analyze edge density in the image
 */
function analyzeEdgeDensity(data, width, height) {
  let edgePixels = 0;
  let totalPixels = 0;
  let maxEdgeRegion = { x: 0, y: 0, width: 0, height: 0, density: 0 };
  
  // Scan in regions to find areas with high edge density
  const regionSize = 64;
  
  for (let y = 0; y < height - regionSize; y += regionSize / 2) {
    for (let x = 0; x < width - regionSize; x += regionSize / 2) {
      let regionEdges = 0;
      let regionPixels = 0;
      
      for (let ry = y; ry < y + regionSize; ry++) {
        for (let rx = x; rx < x + regionSize; rx++) {
          const idx = (ry * width + rx) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          // Simple edge detection
          if (rx > 0 && rx < width - 1) {
            const leftGray = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
            const rightGray = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
            if (Math.abs(gray - leftGray) > 30 || Math.abs(gray - rightGray) > 30) {
              regionEdges++;
            }
          }
          regionPixels++;
        }
      }
      
      const density = regionEdges / regionPixels;
      if (density > maxEdgeRegion.density) {
        maxEdgeRegion = { x, y, width: regionSize, height: regionSize, density };
      }
    }
  }
  
  return {
    confidence: Math.min(maxEdgeRegion.density * 2, 1.0),
    region: maxEdgeRegion,
    density: maxEdgeRegion.density
  };
}

/**
 * Detect line patterns typical of barcodes
 */
function detectLinePatterns(data, width, height) {
  let verticalLines = 0;
  let horizontalLines = 0;
  let maxLineRegion = { x: 0, y: 0, width: 0, height: 0, lines: 0 };
  
  // Scan for vertical lines (common in barcodes)
  for (let x = 0; x < width; x += 4) {
    let lineCount = 0;
    let inLine = false;
    
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      if (gray < 128) { // Dark pixel
        if (!inLine) {
          lineCount++;
          inLine = true;
        }
      } else {
        inLine = false;
      }
    }
    
    if (lineCount > maxLineRegion.lines) {
      maxLineRegion = { x, y: 0, width: 4, height, lines: lineCount };
    }
    verticalLines += lineCount;
  }
  
  const confidence = Math.min(verticalLines / 100, 1.0);
  
  return {
    confidence,
    region: maxLineRegion,
    verticalLines,
    horizontalLines
  };
}

/**
 * Analyze contrast in the image
 */
function analyzeContrast(data, width, height) {
  let totalContrast = 0;
  let contrastPoints = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const centerGray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // Check contrast with neighbors
      const leftGray = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
      const rightGray = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
      
      const contrast = Math.max(
        Math.abs(centerGray - leftGray),
        Math.abs(centerGray - rightGray)
      );
      
      if (contrast > 50) {
        totalContrast += contrast;
        contrastPoints++;
      }
    }
  }
  
  const avgContrast = contrastPoints > 0 ? totalContrast / contrastPoints : 0;
  const confidence = Math.min(avgContrast / 100, 1.0);
  
  return {
    confidence,
    averageContrast: avgContrast,
    contrastPoints
  };
}

/**
 * Detect barcode-like structure
 */
function detectBarcodeStructure(data, width, height) {
  // Look for rectangular regions with alternating dark/light patterns
  let structureScore = 0;
  let bestRegion = { x: 0, y: 0, width: 0, height: 0, score: 0 };
  
  // Scan for potential barcode regions
  for (let y = 0; y < height - 100; y += 20) {
    for (let x = 0; x < width - 200; x += 20) {
      let regionScore = 0;
      let transitions = 0;
      let lastGray = null;
      
      // Check horizontal line for transitions
      for (let rx = x; rx < x + 200; rx++) {
        const idx = (y * width + rx) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (lastGray !== null && Math.abs(gray - lastGray) > 50) {
          transitions++;
        }
        lastGray = gray;
      }
      
      // Score based on number of transitions (barcodes have many)
      regionScore = Math.min(transitions / 20, 1.0);
      
      if (regionScore > bestRegion.score) {
        bestRegion = { x, y, width: 200, height: 100, score: regionScore };
      }
    }
  }
  
  return {
    confidence: bestRegion.score,
    region: bestRegion,
    structureScore: bestRegion.score
  };
}

/**
 * Attempt to extract text from a barcode region
 */
function attemptTextExtraction(imageData, region) {
  if (!region) return null;
  
  try {
    // Create a canvas to process the barcode region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set canvas size to the region
    canvas.width = region.width;
    canvas.height = region.height;
    
    // Draw the region to the canvas
    ctx.drawImage(
      document.getElementById('scanner-video'),
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );
    
    // Get the region data
    const regionData = ctx.getImageData(0, 0, region.width, region.height);
    
    // Simple OCR-like processing for numbers
    // This is a basic implementation - in a real app you'd use a proper OCR library
    const extractedText = simpleNumberExtraction(regionData);
    
    console.log("Extracted text:", extractedText);
    return extractedText;
    
  } catch (error) {
    console.log("Text extraction failed:", error);
    return null;
  }
}

/**
 * Simple number extraction from image data
 */
function simpleNumberExtraction(imageData) {
  // This is a very basic implementation
  // In practice, you'd want to use a proper OCR library like Tesseract.js
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Convert to binary (black/white) for pattern recognition
  const binary = new Uint8Array(width * height);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    binary[i / 4] = gray < 128 ? 1 : 0;
  }
  
  // Look for patterns that might be numbers
  // This is simplified - real OCR would be much more sophisticated
  let potentialNumbers = '';
  
  // Scan horizontally for number-like patterns
  for (let y = 0; y < height; y += 10) {
    let linePattern = '';
    for (let x = 0; x < width; x += 2) {
      const idx = y * width + x;
      linePattern += binary[idx] ? '1' : '0';
    }
    
    // Look for sequences of 1s and 0s that might represent numbers
    const matches = linePattern.match(/1{3,}/g);
    if (matches && matches.length > 5) {
      potentialNumbers += 'X'; // Placeholder for detected pattern
    }
  }
  
  // For now, return a placeholder since real OCR is complex
  // In a production app, you'd integrate with Tesseract.js or similar
  return potentialNumbers.length > 5 ? '9780000000000' : null; // Placeholder ISBN
}

/**
 * Validate ISBN code format
 */
function isValidISBNCode(code, format) {
  if (!code || typeof code !== 'string') return false;
  
  // Remove any non-digit characters
  const cleanCode = code.replace(/\D/g, '');
  
  // Check for common ISBN lengths
  if (cleanCode.length === 10 || cleanCode.length === 13) {
    // Basic validation - in production you'd want more sophisticated validation
    return true;
  }
  
  // Check if it's a valid barcode format that might contain ISBN
  const validFormats = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
  if (validFormats.includes(format)) {
    return true;
  }
  
  return false;
}

/**
 * Get camera constraints
 */
function getCameraConstraints() {
  return Promise.resolve({
    video: {
      width: { min: 640, ideal: 1280, max: 1920 },
      height: { min: 480, ideal: 720, max: 1080 },
      facingMode: "environment"
    }
  });
}

/**
 * Detect browser and version
 */
function detectBrowser() {
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
}

/**
 * Detect browser features
 */
function detectFeatures() {
  const features = {
    // Protocol and security
    isHttps: window.location.protocol === 'https:',
    isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Browser capabilities
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
    hasEnumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
    
    // BarcodeDetector support
    hasBarcodeDetector: 'BarcodeDetector' in window,
    barcodeDetectorType: typeof window.BarcodeDetector,
    barcodeDetectorValue: window.BarcodeDetector,
    
    // Experimental implementations
    hasShapeDetection: 'ShapeDetector' in window,
    hasTextDetector: 'TextDetector' in window,
    hasFaceDetector: 'FaceDetector' in window,
    
    // Camera permissions (async)
    cameraPermissions: 'unknown'
  };
  
  // Check camera permissions if possible
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'camera' })
      .then(result => {
        features.cameraPermissions = result.state;
        console.log('Camera permissions state:', result.state);
      })
      .catch(err => {
        features.cameraPermissions = 'query_failed';
        console.log('Camera permissions query failed:', err);
      });
  }
  
  return features;
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
 * Update scanner status
 */
function updateScannerStatus(message, type = 'info') {
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
}

/**
 * Handle successful scan
 */
function handleSuccessfulScan(code) {
  console.log("[handleSuccessfulScan] Called with code:", code);
  console.log("[handleSuccessfulScan] Debug info:", {
    debugEnabled: window.debugEnabled,
    autofetchBookData: typeof window.autofetchBookData,
    ScannerModule: typeof window.ScannerModule,
    scannerState: window.scannerState,
    zxingActive: window.zxingActive
  });
  
  // Fill in the ISBN field
  const isbnField = document.getElementById('isbn');
  if (isbnField) {
    isbnField.value = code;
    isbnField.dispatchEvent(new Event('input', { bubbles: true }));
    console.log("[handleSuccessfulScan] ISBN field updated:", code);
  } else {
    console.log("[handleSuccessfulScan] ISBN field not found");
  }
  
  // Stop scanner only if we're in browser mode and scanner is active
  if (window.ScannerModule && window.ScannerModule.stopScanner && 
      (window.scannerState === 'scanning' || window.zxingActive)) {
    console.log('[handleSuccessfulScan] Stopping browser scanner');
    window.ScannerModule.stopScanner();
  } else {
    console.log('[handleSuccessfulScan] No browser scanner to stop (likely native scan)');
  }
  
  // Show success notification
  showNotification(`ISBN detected: ${code}`, 'success', 2000);
  
  // Auto-fetch the book data
  setTimeout(() => {
    console.log('[handleSuccessfulScan] About to call autofetchBookData');
    console.log('[handleSuccessfulScan] autofetchBookData available:', typeof window.autofetchBookData);
    if (window.autofetchBookData) {
      console.log('[handleSuccessfulScan] Calling autofetchBookData');
      window.autofetchBookData();
    } else {
      console.log('[handleSuccessfulScan] autofetchBookData not available, trying fetch button');
      const fetchButton = document.querySelector('button[name="fetch"]');
      if (fetchButton) {
        console.log('[handleSuccessfulScan] Clicking fetch button');
        fetchButton.click();
      } else {
        console.log('[handleSuccessfulScan] Fetch button not found');
      }
    }
  }, 500);
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element
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
  
  // Set background color based on type
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
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove after duration
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

/**
 * Show BarcodeDetector diagnostics
 */
function showBarcodeDetectorDiagnostics(browser, version, features) {
  // Check if HTTPS is required
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  let httpsMessage = '';
  if (!isHttps && !isLocalhost) {
    httpsMessage = `
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h5 style="color: #856404; margin-bottom: 10px;">🔒 HTTPS Required:</h5>
        <p style="margin: 0;">
          BarcodeDetector API requires HTTPS for security. Please access this site via HTTPS.
        </p>
      </div>
    `;
  }
  
  // Create detailed diagnostic information
  const diagnosticInfo = `
    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 10px; font-family: monospace; font-size: 0.8rem;">
      <strong>Diagnostic Info:</strong><br>
      Protocol: ${features.isHttps ? 'HTTPS' : 'HTTP'}<br>
      Localhost: ${features.isLocalhost ? 'Yes' : 'No'}<br>
      MediaDevices: ${features.hasMediaDevices ? 'Yes' : 'No'}<br>
      GetUserMedia: ${features.hasGetUserMedia ? 'Yes' : 'No'}<br>
      BarcodeDetector: ${features.hasBarcodeDetector ? 'Yes' : 'No'}<br>
      ShapeDetector: ${features.hasShapeDetection ? 'Yes' : 'No'}<br>
      TextDetector: ${features.hasTextDetector ? 'Yes' : 'No'}<br>
      FaceDetector: ${features.hasFaceDetector ? 'Yes' : 'No'}<br>
      Camera Permissions: ${features.cameraPermissions}
    </div>
  `;
  
  // Chrome-specific guidance
  let chromeGuidance = '';
  if (browser === 'Chrome') {
    const chromeVersion = parseInt(version);
    if (chromeVersion >= 83) {
      chromeGuidance = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h5 style="color: #856404; margin-bottom: 10px;">🔧 Chrome ${version} - Enable BarcodeDetector:</h5>
          <p style="margin: 0; font-size: 0.9rem;">
            Your Chrome version supports BarcodeDetector but it's disabled by default. Enable it:
          </p>
          <ol style="text-align: left; margin: 10px 0 0 0; padding-left: 20px; font-size: 0.9rem;">
            <li>Open a new tab and go to: <code>chrome://flags/</code></li>
            <li>Search for "BarcodeDetector" or "Shape Detection"</li>
            <li>Find "BarcodeDetector API" or "Shape Detection API"</li>
            <li>Change from "Default" to "Enabled"</li>
            <li>Click "Relaunch" to restart Chrome</li>
            <li>Come back and try the scanner again</li>
          </ol>
          <p style="margin: 10px 0 0 0; font-size: 0.8rem; color: #666;">
            <strong>Alternative:</strong> If you can't find BarcodeDetector, search for "Shape Detection" instead.
          </p>
        </div>
      `;
    } else {
      chromeGuidance = `
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h5 style="color: #721c24; margin-bottom: 10px;">⚠️ Chrome ${version} - Update Required:</h5>
          <p style="margin: 0; font-size: 0.9rem;">
            Your Chrome version (${version}) is too old for BarcodeDetector API. 
            Please update to Chrome 83+ for barcode scanning support.
          </p>
        </div>
      `;
    }
  }
  
  // Show comprehensive error message with browser recommendations
  const errorMessage = `
    <div style="text-align: center; padding: 20px;">
      <h4 style="color: #dc3545; margin-bottom: 15px;">📱 Barcode Scanner Not Available</h4>
      <p style="margin-bottom: 15px;">
        Your browser (${browser} ${version}) doesn't support barcode scanning. Here are your options:
      </p>
      ${httpsMessage}
      ${diagnosticInfo}
      ${chromeGuidance}
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h5 style="color: #495057; margin-bottom: 10px;">🌐 Recommended Browsers:</h5>
        <ul style="text-align: left; margin: 0; padding-left: 20px;">
          <li><strong>Chrome/Edge:</strong> Version 83+ (Desktop & Mobile)</li>
          <li><strong>Safari:</strong> Version 14+ (iOS 14+, macOS 11+)</li>
          <li><strong>Firefox:</strong> Version 79+ (Desktop only)</li>
        </ul>
      </div>
      <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h5 style="color: #0056b3; margin-bottom: 10px;">📱 Native App Option:</h5>
        <p style="margin: 0;">
          For the best experience, consider using the native app which provides 
          superior barcode scanning capabilities.
        </p>
      </div>
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
        <h5 style="color: #856404; margin-bottom: 10px;">✏️ Manual Entry:</h5>
        <p style="margin: 0;">
          You can still manually enter the ISBN number in the field below.
        </p>
      </div>
    </div>
  `;
  
  // Update status div with detailed information
  const statusDiv = document.getElementById('scannerStatus');
  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = errorMessage;
    statusDiv.style.background = '#fff';
    statusDiv.style.border = '2px solid #dc3545';
    statusDiv.style.borderRadius = '10px';
    statusDiv.style.color = '#333';
  }
  
  // Show notification with action buttons
  showNotification('Barcode scanner not available - trying alternative methods...', 'warning', 4000);
}

// Export functions for use in other modules
window.ScannerUtils = {
  enhancedBarcodeDetection,
  analyzeEdgeDensity,
  detectLinePatterns,
  analyzeContrast,
  detectBarcodeStructure,
  attemptTextExtraction,
  simpleNumberExtraction,
  isValidISBNCode,
  getCameraConstraints,
  detectBrowser,
  detectFeatures,
  setupMobileFocusDetection,
  updateScannerStatus,
  handleSuccessfulScan,
  showNotification,
  showBarcodeDetectorDiagnostics
}; 