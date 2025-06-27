/**
 * BookOracle ZXing Scanner Module
 * Handles ZXing-js browser-based barcode scanning
 */

// Global variables for ZXing scanner
let zxingActive = false;
let zxingCodeReader = null;
let zxingStream = null; // Track the original stream explicitly

/**
 * Check if browser scanner is available
 */
function isBrowserScannerAvailable() {
  console.log('[ScannerZXing] === START BROWSER SCANNER CALLED ===');
  console.log('[ScannerZXing] Current zxingActive state:', zxingActive);
  
  // Check for ZXing library
  const hasZXingBrowser = typeof ZXingBrowser !== 'undefined';
  const hasBrowserMultiFormatReader = hasZXingBrowser && typeof ZXingBrowser.BrowserMultiFormatReader === 'function';
  
  const debugInfo = {
    hasZXingBrowser,
    hasBrowserMultiFormatReader,
    ZXingBrowser: typeof ZXingBrowser,
    BrowserMultiFormatReader: typeof ZXingBrowser !== 'undefined' ? typeof ZXingBrowser.BrowserMultiFormatReader : 'N/A'
  };
  
  console.log('[ScannerZXing] Browser scanner availability check:', debugInfo);
  
  return hasZXingBrowser && hasBrowserMultiFormatReader;
}

/**
 * Start browser scanner
 */
async function startBrowserScanner() {
  console.log('[ScannerZXing] === START BROWSER SCANNER CALLED ===');
  console.log('[ScannerZXing] Current zxingActive state:', zxingActive);
  
  if (zxingActive) {
    console.log('[ScannerZXing] Browser scanner already active');
    return;
  }
  
  if (!isBrowserScannerAvailable()) {
    throw new Error('ZXing browser scanner not available');
  }
  
  console.log('[ScannerZXing] === INITIALIZING ZXING SCANNER ===');
  
  try {
    // Create ZXing reader
    console.log('[ScannerZXing] Creating ZXing reader...');
    zxingCodeReader = new ZXingBrowser.BrowserMultiFormatReader();
    
    // Get video element
    const video = document.getElementById('scanner-video');
    if (!video) {
      throw new Error('Scanner video element not found');
    }
    
    // Request camera permissions and get stream
    console.log('[ScannerZXing] Requesting camera permissions...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Prefer back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
    // Store the stream reference explicitly
    zxingStream = stream;
    console.log('[ScannerZXing] Camera stream obtained, setting up video...');
    
    // Set up video element
    video.srcObject = stream;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    
    // Wait for video to be ready
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Video setup timeout')), 10000);
    });
    
    // Start video playback
    await video.play();
    
    // Start ZXing decoding
    console.log('[ScannerZXing] Starting ZXing decoding...');
    await zxingCodeReader.decodeFromVideoElement(video, (result, error) => {
      // Only process if scanner is still active
      if (!zxingActive) {
        return;
      }
      
      if (result) {
        console.log('[ScannerZXing] Barcode detected:', result.text);
        if (window.ScannerData && window.ScannerData.handleSuccessfulScan) {
          window.ScannerData.handleSuccessfulScan(result.text);
        }
      } else if (error) {
        // Handle different types of errors appropriately
        if (error.name === 'NotFoundException' || 
            error.message.includes('No MultiFormat Readers were able to detect the code')) {
          // This is normal - no barcode visible, don't log anything
          return;
        } else {
          // Only log actual errors, not "no barcode found" which is normal
          console.warn('[ScannerZXing] Decoding error:', error);
          if (window.ScannerData && window.ScannerData.handleScanError) {
            window.ScannerData.handleScanError(error);
          }
        }
      }
    });
    
    zxingActive = true;
    
    // Update UI
    if (window.ScannerUI) {
      window.ScannerUI.updateScannerStatus('Scanner active - point camera at barcode', 'success');
    }
    
    console.log('[ScannerZXing] === ZXING SCANNER STARTED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('[ScannerZXing] === FAILED TO START ZXING SCANNER ===', error);
    zxingActive = false;
    
    // Clean up on error
    if (zxingStream) {
      zxingStream.getTracks().forEach(track => track.stop());
      zxingStream = null;
    }
    
    throw error;
  }
}

/**
 * Stop browser scanner
 */
async function stopBrowserScanner() {
  console.log('[ScannerZXing] === STOP BROWSER SCANNER CALLED ===');
  console.log('[ScannerZXing] Current zxingActive state:', zxingActive);
  
  if (!zxingActive) {
    console.log('[ScannerZXing] Browser scanner not active, nothing to stop');
    return;
  }
  
  console.log('[ScannerZXing] === STOPPING ZXING SCANNER ===');
  
  try {
    // Step 1: Set active flag to false first to prevent new callbacks
    zxingActive = false;
    
    // Step 2: Stop ZXing reader first
    if (zxingCodeReader) {
      console.log('[ScannerZXing] Stopping ZXing code reader...');
      try {
        // Try the newer API first
        if (typeof zxingCodeReader.reset === 'function') {
          await zxingCodeReader.reset();
        } else if (typeof zxingCodeReader.stopAsyncDecode === 'function') {
          zxingCodeReader.stopAsyncDecode();
        } else if (typeof zxingCodeReader.stop === 'function') {
          zxingCodeReader.stop();
        }
        console.log('[ScannerZXing] ZXing code reader stopped');
      } catch (resetError) {
        console.warn('[ScannerZXing] Error resetting ZXing reader:', resetError);
        // Continue with cleanup even if reset fails
      }
      zxingCodeReader = null;
    }
    
    // Step 3: Stop the original stream explicitly (this is the key!)
    if (zxingStream) {
      console.log('[ScannerZXing] Stopping original stream tracks...');
      try {
        const tracks = zxingStream.getTracks();
        console.log('[ScannerZXing] Found', tracks.length, 'tracks to stop');
        
        tracks.forEach((track, index) => {
          console.log('[ScannerZXing] Stopping track', index, ':', track.kind, track.label);
          track.stop(); // This is what actually releases the camera
        });
        
        zxingStream = null;
        console.log('[ScannerZXing] Original stream tracks stopped and cleared');
      } catch (streamError) {
        console.warn('[ScannerZXing] Error stopping original stream:', streamError);
        zxingStream = null;
      }
    }
    
    // Step 4: Clear video element
    const video = document.getElementById('scanner-video');
    if (video) {
      console.log('[ScannerZXing] Clearing video element...');
      try {
        video.pause();
        video.srcObject = null;
        
        // Remove event listeners
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onplay = null;
        video.onpause = null;
        video.onended = null;
        video.onerror = null;
        
        console.log('[ScannerZXing] Video element cleared');
      } catch (videoError) {
        console.warn('[ScannerZXing] Error clearing video element:', videoError);
      }
    }
    
    // Step 5: SCORCHED EARTH - Forcefully kill any remaining MediaStreams
    console.log('[ScannerZXing] === SCORCHED EARTH CLEANUP ===');
    try {
      // Get a new stream and immediately stop all tracks
      console.log('[ScannerZXing] Forcefully killing any remaining MediaStreams...');
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => {
        console.log('[ScannerZXing] Force stopping track:', track.kind, track.label);
        track.stop();
      });
      console.log('[ScannerZXing] Scorched earth cleanup completed');
    } catch (scorchedError) {
      console.log('[ScannerZXing] No active stream to force stop (this is good):', scorchedError.message);
    }
    
    // Step 6: Clear global references
    if (window.currentMediaStream === zxingStream) {
      window.currentMediaStream = null;
    }
    
    // Step 7: Additional cleanup for any remaining streams
    try {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices && mediaDevices.enumerateDevices) {
        const devices = await mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('[ScannerZXing] Available video devices after cleanup:', videoDevices.length);
      }
    } catch (enumError) {
      console.warn('[ScannerZXing] Error enumerating devices:', enumError);
    }
    
    console.log('[ScannerZXing] === ZXING SCANNER STOPPED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('[ScannerZXing] === ERROR STOPPING ZXING SCANNER ===', error);
    
    // Force cleanup even on error
    try {
      if (zxingStream) {
        zxingStream.getTracks().forEach(track => track.stop());
        zxingStream = null;
      }
      const video = document.getElementById('scanner-video');
      if (video) {
        video.srcObject = null;
      }
    } catch (cleanupError) {
      console.warn('[ScannerZXing] Error during forced cleanup:', cleanupError);
    }
  }
}

/**
 * Get browser scanner status
 */
function getBrowserScannerStatus() {
  return {
    available: isBrowserScannerAvailable(),
    active: zxingActive,
    hasStream: !!zxingStream
  };
}

/**
 * Debug ZXing scanner availability
 */
function debugZXingScanner() {
  console.log('[ScannerZXing] Debug function called');
  
  const debugInfo = {
    ZXingBrowser: typeof ZXingBrowser,
    BrowserMultiFormatReader: typeof ZXingBrowser !== 'undefined' ? typeof ZXingBrowser.BrowserMultiFormatReader : 'N/A',
    isAvailable: isBrowserScannerAvailable(),
    zxingActive,
    hasStream: !!zxingStream,
    hasCodeReader: !!zxingCodeReader
  };
  
  console.log('[ScannerZXing] Debug info:', debugInfo);
  return debugInfo;
}

/**
 * Nuclear cleanup - last resort for stubborn camera connections
 */
async function nuclearCameraCleanup() {
  console.log('[ScannerZXing] === NUCLEAR CAMERA CLEANUP ===');
  
  try {
    // Step 1: Stop all possible media streams
    console.log('[ScannerZXing] Step 1: Stopping all media streams...');
    
    // Get all video elements
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video, index) => {
      console.log('[ScannerZXing] Stopping video', index, 'stream...');
      if (video.srcObject) {
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => {
            console.log('[ScannerZXing] Stopping track:', track.kind, track.label);
            track.stop();
          });
        }
        video.srcObject = null;
        video.pause();
      }
    });
    
    // Step 2: Stop our tracked stream explicitly
    if (zxingStream) {
      console.log('[ScannerZXing] Step 2: Stopping tracked stream...');
      zxingStream.getTracks().forEach(track => {
        console.log('[ScannerZXing] Stopping tracked track:', track.kind, track.label);
        track.stop();
      });
      zxingStream = null;
    }
    
    // Step 3: SCORCHED EARTH - Forcefully kill any remaining MediaStreams
    console.log('[ScannerZXing] Step 3: Scorched earth cleanup...');
    try {
      // Get a new stream and immediately stop all tracks
      console.log('[ScannerZXing] Forcefully killing any remaining MediaStreams...');
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => {
        console.log('[ScannerZXing] Force stopping track:', track.kind, track.label);
        track.stop();
      });
      console.log('[ScannerZXing] Scorched earth cleanup completed');
    } catch (scorchedError) {
      console.log('[ScannerZXing] No active stream to force stop (this is good):', scorchedError.message);
    }
    
    // Step 4: Remove all video elements from DOM
    console.log('[ScannerZXing] Step 4: Removing all video elements from DOM...');
    allVideos.forEach((video, index) => {
      if (video.parentNode) {
        video.parentNode.removeChild(video);
        console.log('[ScannerZXing] Removed video element', index);
      }
    });
    
    // Step 5: Clear all global references
    console.log('[ScannerZXing] Step 5: Clearing global references...');
    window.currentMediaStream = null;
    zxingCodeReader = null;
    zxingActive = false;
    
    // Step 6: Force garbage collection multiple times
    console.log('[ScannerZXing] Step 6: Force garbage collection...');
    if (window.gc) {
      for (let i = 0; i < 5; i++) {
        window.gc();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Step 7: Long delay for browser to process
    console.log('[ScannerZXing] Step 7: Waiting for browser to process cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 8: Recreate scanner video element
    console.log('[ScannerZXing] Step 8: Recreating scanner video element...');
    const scannerContainer = document.getElementById('scanner-viewport');
    if (scannerContainer) {
      const newVideo = document.createElement('video');
      newVideo.id = 'scanner-video';
      newVideo.autoplay = true;
      newVideo.playsInline = true;
      newVideo.muted = true;
      newVideo.style.width = '100%';
      newVideo.style.height = '100%';
      newVideo.style.objectFit = 'cover';
      
      scannerContainer.appendChild(newVideo);
      console.log('[ScannerZXing] Scanner video element recreated');
    }
    
    // Step 9: Final device enumeration
    try {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices && mediaDevices.enumerateDevices) {
        const devices = await mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('[ScannerZXing] Available video devices after nuclear cleanup:', videoDevices.length);
        videoDevices.forEach((device, index) => {
          console.log('[ScannerZXing] Video device', index, ':', device.label || 'Unknown device');
        });
      }
    } catch (enumError) {
      console.warn('[ScannerZXing] Error enumerating devices after nuclear cleanup:', enumError);
    }
    
    console.log('[ScannerZXing] === NUCLEAR CAMERA CLEANUP COMPLETED ===');
    
  } catch (error) {
    console.error('[ScannerZXing] === ERROR DURING NUCLEAR CLEANUP ===', error);
  }
}

// Export functions to global scope
window.ScannerZXing = {
  startBrowserScanner,
  stopBrowserScanner,
  isBrowserScannerAvailable,
  getBrowserScannerStatus,
  debugZXingScanner,
  nuclearCameraCleanup,
  zxingActive
}; 