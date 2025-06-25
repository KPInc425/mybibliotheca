/**
 * MyBibliotheca Scanner Data Module
 * Handles book data fetching and form filling functionality
 */

/**
 * AJAX autofetch logic for Fetch Book Data button
 */
function autofetchBookData() {
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[autofetchBookData] Called');
  }
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
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[autofetchBookData] ISBN to fetch:', isbn);
  }
  console.log('[autofetchBookData] ISBN value:', isbn);
  
  if (!isbn) {
    if (window.showNotification) {
      window.showNotification('Please enter an ISBN first', 'warning', 2000);
    }
    if (window.ScannerCore) {
      window.ScannerCore.debugLog('[autofetchBookData] No ISBN entered, aborting');
    }
    console.log('[autofetchBookData] No ISBN entered, aborting');
    return;
  }
  
  const fetchBtn = document.getElementById('fetchBtn');
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[autofetchBookData] Fetch button found:', !!fetchBtn);
  }
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
  
  if (window.ScannerCore) {
    window.ScannerCore.debugLog('[autofetchBookData] Making fetch request to:', `/fetch_book/${isbn}`);
  }
  console.log('[autofetchBookData] Making fetch request to:', `/fetch_book/${isbn}`);
  
  fetch(`/fetch_book/${isbn}`)
    .then(response => {
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[autofetchBookData] Fetch response status:', response.status);
      }
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
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[autofetchBookData] Fetch result:', data);
      }
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
        
        if (window.showNotification) {
          window.showNotification('Book data fetched successfully!', 'success', 2000);
        }
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('[autofetchBookData] Book data filled in form');
        }
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
        
        if (window.showNotification) {
          window.showNotification('No book data found for the provided ISBN.', 'warning', 2000);
        }
        if (window.ScannerCore) {
          window.ScannerCore.debugLog('[autofetchBookData] No book data found');
        }
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
      
      if (window.showNotification) {
        window.showNotification('Error fetching book data. Please try again.', 'error', 2000);
      }
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[autofetchBookData] AJAX autofetch error', error);
      }
    })
    .finally(() => {
      if (fetchBtn) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = '🔍 Fetch Book Data';
      }
      if (window.ScannerCore) {
        window.ScannerCore.debugLog('[autofetchBookData] Fetch complete');
      }
      console.log('[autofetchBookData] Fetch complete');
    });
}

/**
 * Handle successful scan with data fetching
 */
function handleSuccessfulScan(code) {
  console.log("[handleSuccessfulScan] Called with code:", code);
  console.log("[handleSuccessfulScan] Debug info:", {
    debugEnabled: window.debugEnabled,
    autofetchBookData: typeof window.autofetchBookData,
    ScannerModule: typeof window.ScannerModule,
    scannerState: window.ScannerCore ? window.ScannerCore.scannerState : 'unknown',
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
  if (window.ScannerCore && window.ScannerCore.stopScanner && 
      (window.ScannerCore.scannerState === 'scanning' || window.zxingActive)) {
    console.log('[handleSuccessfulScan] Stopping browser scanner');
    window.ScannerCore.stopScanner();
  } else {
    console.log('[handleSuccessfulScan] No browser scanner to stop (likely native scan)');
  }
  
  // Show success notification
  if (window.showNotification) {
    window.showNotification(`ISBN detected: ${code}`, 'success', 2000);
  }
  
  // Auto-fetch book data after a short delay
  setTimeout(() => {
    if (window.debugEnabled) {
      console.log('[handleSuccessfulScan] Debug mode enabled - auto-fetch skipped');
      if (window.showNotification) {
        window.showNotification('Debug mode: Click "Fetch Book Data" manually', 'info', 3000);
      }
    } else if (window.autofetchBookData) {
      console.log('[handleSuccessfulScan] Calling autofetchBookData');
      window.autofetchBookData();
    } else {
      console.log('[handleSuccessfulScan] autofetchBookData not available');
      if (window.showNotification) {
        window.showNotification('Please click "Fetch Book Data" to get book information', 'info', 3000);
      }
    }
  }, 500);
}

// Export data functions
window.ScannerData = {
  autofetchBookData,
  handleSuccessfulScan
};

// Make functions available globally for other modules
window.autofetchBookData = autofetchBookData;
window.handleSuccessfulScan = handleSuccessfulScan;

// Initialize event listeners when module loads
document.addEventListener('DOMContentLoaded', function() {
  const fetchBtn = document.getElementById('fetchBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', autofetchBookData);
  }
}); 