/**
 * MyBibliotheca Scanner UI Module
 * Handles all scanner-related UI operations, notifications, and status updates
 */

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
 * Show notification with styling
 */
function showNotification(message, type = 'info', duration = 3000) {
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
}

/**
 * Update scanner status display
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
    statusDiv.style.display = 'block';
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
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
        <h5 style="color: #856404; margin-bottom: 10px;">✏️ Manual Entry:</h5>
        <p style="margin: 0;">
          You can still manually enter the ISBN number in the field below.
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
 * Focus on ISBN field for manual entry
 */
function focusOnISBNField() {
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
}

/**
 * Update scanner button state
 */
function updateScannerButton(text, className, disabled = false) {
  const scannerBtn = document.getElementById('scannerBtn');
  if (scannerBtn) {
    scannerBtn.textContent = text;
    scannerBtn.className = className;
    scannerBtn.disabled = disabled;
  }
}

/**
 * Show/hide scanner container
 */
function toggleScannerContainer(show = true) {
  const scannerDiv = document.getElementById('scanner');
  if (scannerDiv) {
    scannerDiv.style.display = show ? 'block' : 'none';
  }
}

/**
 * Show/hide status container
 */
function toggleStatusContainer(show = true) {
  const statusDiv = document.getElementById('scannerStatus');
  if (statusDiv) {
    statusDiv.style.display = show ? 'block' : 'none';
  }
}

// Export UI functions
window.ScannerUI = {
  setupMobileOptimizations,
  setupMobileFocusDetection,
  showNotification,
  updateScannerStatus,
  showBarcodeDetectorDiagnostics,
  focusOnISBNField,
  updateScannerButton,
  toggleScannerContainer,
  toggleStatusContainer
};

// Make showNotification available globally for other modules
window.showNotification = showNotification; 