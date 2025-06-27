/**
 * BookOracle Scanner UI Module
 * Handles all scanner-related UI operations, notifications, and status updates
 */

/**
 * Setup mobile optimizations for better scanning experience
 */
function setupMobileOptimizations() {
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
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      height: 60%;
      border: 3px solid #DAA520;
      border-radius: 15px;
      pointer-events: none;
      box-shadow: 0 0 20px rgba(218, 165, 32, 0.6);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(218, 165, 32, 0.6); }
      50% { box-shadow: 0 0 30px rgba(218, 165, 32, 0.8); }
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
 * Show notification with improved stacking
 */
function showNotification(message, type = 'info', duration = 5000) {
  const notificationStack = document.getElementById('notificationStack');
  if (!notificationStack) return;

  const notification = document.createElement('div');
  notification.className = `alert alert-${type} animate-slide-in shadow-lg max-w-sm`;
  
  // Add icon based on type
  let icon = '';
  switch (type) {
    case 'success':
      icon = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      break;
    case 'error':
      icon = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      break;
    case 'warning':
      icon = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>';
      break;
    default:
      icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }
  
  notification.innerHTML = `
    ${icon}
    <span>${message}</span>
    <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()">✕</button>
  `;
  
  notificationStack.appendChild(notification);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('animate-fade-out');
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
}

/**
 * Update scanner status display
 */
function updateScannerStatus(message, type = 'info') {
  const statusDiv = document.getElementById('scannerStatus');
  if (!statusDiv) return;
  
  statusDiv.className = `alert alert-${type} mt-4`;
  statusDiv.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span>${message}</span>
  `;
  statusDiv.style.display = 'block';
}

/**
 * Hide scanner status
 */
function hideScannerStatus() {
  const statusDiv = document.getElementById('scannerStatus');
  if (statusDiv) {
    statusDiv.style.display = 'none';
  }
}

/**
 * Show barcode detector diagnostics
 */
function showBarcodeDetectorDiagnostics(browser, version, features) {
  const statusDiv = document.getElementById('scannerStatus');
  if (!statusDiv) return;
  
  // Build diagnostic information
  let httpsMessage = '';
  if (!features.isHttps && !features.isLocalhost) {
    httpsMessage = `
      <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h5 style="color: #721c24; margin-bottom: 10px;">⚠️ HTTPS Required</h5>
        <p style="margin: 0;">
          Barcode scanning requires HTTPS. Please use a secure connection or localhost.
        </p>
      </div>
    `;
  }
  
  const diagnosticInfo = `
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <h5 style="color: #495057; margin-bottom: 10px;">🔧 Technical Details:</h5>
      <ul style="text-align: left; margin: 0; padding-left: 20px; font-size: 0.9rem;">
        <li>Browser: ${browser} ${version}</li>
        <li>BarcodeDetector: ${features.hasBarcodeDetector ? 'Available' : 'Not Available'}</li>
        <li>MediaDevices: ${features.hasMediaDevices ? 'Available' : 'Not Available'}</li>
        <li>Camera Permissions: ${features.cameraPermissions}</li>
        <li>Protocol: ${window.location.protocol}</li>
      </ul>
    </div>
  `;
  
  let chromeGuidance = '';
  if (browser === 'Chrome' && parseInt(version) < 83) {
    chromeGuidance = `
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <h5 style="color: #856404; margin-bottom: 10px;">🔄 Update Chrome</h5>
        <p style="margin: 0;">
          Your Chrome version (${version}) is too old. Please update to version 83 or later for barcode scanning support.
        </p>
      </div>
    `;
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
    </div>
  `;
  
  // Update status div with detailed information
  statusDiv.innerHTML = errorMessage;
  statusDiv.style.background = '#fff3cd';
  statusDiv.style.border = '2px solid #856404';
  statusDiv.style.borderRadius = '10px';
  statusDiv.style.color = '#333';
  statusDiv.style.display = 'block';
}

/**
 * Update scanner button state
 */
function updateScannerButton(isScanning = false) {
  const scannerBtn = document.getElementById('scannerBtn');
  if (!scannerBtn) return;
  
  if (isScanning) {
    scannerBtn.innerHTML = '🛑 Stop Scanner';
    scannerBtn.className = 'btn btn-error btn-lg';
    scannerBtn.onclick = () => {
      if (typeof stopScanner === 'function') {
        stopScanner();
      }
    };
  } else {
    scannerBtn.innerHTML = '📷 Scan Barcode';
    scannerBtn.className = 'btn btn-primary btn-lg';
    scannerBtn.onclick = () => {
      if (typeof handleScannerButtonClick === 'function') {
        handleScannerButtonClick();
      }
    };
  }
}

/**
 * Show scanner viewport
 */
function showScannerViewport() {
  const scanner = document.getElementById('scanner');
  if (scanner) {
    scanner.classList.remove('hidden');
    scanner.classList.add('block');
  }
}

/**
 * Hide scanner viewport
 */
function hideScannerViewport() {
  const scanner = document.getElementById('scanner');
  if (scanner) {
    scanner.classList.add('hidden');
    scanner.classList.remove('block');
  }
}

/**
 * Update book cover preview
 */
function updateBookCover(coverUrl) {
  const coverImg = document.getElementById('coverPreviewImg');
  if (coverImg && coverUrl) {
    coverImg.src = coverUrl;
  }
}

/**
 * Fill form fields with book data
 */
function fillBookForm(bookData) {
  if (!bookData) return;
  
  const fields = {
    'title': bookData.title,
    'author': bookData.author,
    'publisher': bookData.publisher,
    'publication_date': bookData.published_date,
    'pages': bookData.page_count,
    'language': bookData.language,
    'format': bookData.format,
    'description': bookData.description
  };
  
  Object.entries(fields).forEach(([fieldName, value]) => {
    const field = document.getElementById(fieldName);
    if (field && value) {
      field.value = value;
    }
  });
  
  // Update cover if available
  if (bookData.cover) {
    updateBookCover(bookData.cover);
  }
}

/**
 * Show loading state for fetch button
 */
function showFetchLoading() {
  const fetchBtn = document.getElementById('fetchBtn');
  if (fetchBtn) {
    fetchBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Fetching...';
    fetchBtn.disabled = true;
  }
}

/**
 * Reset fetch button state
 */
function resetFetchButton() {
  const fetchBtn = document.getElementById('fetchBtn');
  if (fetchBtn) {
    fetchBtn.innerHTML = '🔍 Fetch Book Data';
    fetchBtn.disabled = false;
  }
}

// Export functions to global scope
window.ScannerUI = {
  setupMobileOptimizations,
  setupMobileFocusDetection,
  showNotification,
  updateScannerStatus,
  hideScannerStatus,
  showBarcodeDetectorDiagnostics,
  updateScannerButton,
  showScannerViewport,
  hideScannerViewport,
  updateBookCover,
  fillBookForm,
  showFetchLoading,
  resetFetchButton
};

// Make showNotification available globally for other modules
window.showNotification = showNotification; 