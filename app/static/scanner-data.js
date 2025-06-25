/**
 * MyBibliotheca Scanner Data Module
 * Handles book data fetching and form filling functionality
 */

// Track if we've already processed a scan to prevent duplicates
let lastProcessedScan = null;
let lastProcessedTime = 0;

/**
 * AJAX autofetch logic for Fetch Book Data button
 */
function autofetchBookData() {
  const isbn = document.getElementById('isbn').value.trim();
  
  if (!isbn) {
    if (window.ScannerUI && window.ScannerUI.showNotification) {
      window.ScannerUI.showNotification('Please enter an ISBN number first', 'warning');
    }
    return;
  }
  
  // Show loading state
  if (window.ScannerUI && window.ScannerUI.showFetchLoading) {
    window.ScannerUI.showFetchLoading();
  }
  
  // Make AJAX request to fetch book data using the correct endpoint
  fetch(`/fetch_book/${isbn}`)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data && data.title) {
      // Fill form with book data
      if (window.ScannerUI && window.ScannerUI.fillBookForm) {
        window.ScannerUI.fillBookForm(data);
      }
      
      // Show success notification
      if (window.ScannerUI && window.ScannerUI.showNotification) {
        window.ScannerUI.showNotification('Book data fetched successfully!', 'success');
      }
    } else {
      throw new Error('No book data found for this ISBN');
    }
  })
  .catch(error => {
    console.error('Error fetching book data:', error);
    
    // Show error notification
    if (window.ScannerUI && window.ScannerUI.showNotification) {
      window.ScannerUI.showNotification(
        `Failed to fetch book data: ${error.message}`, 
        'error'
      );
    }
  })
  .finally(() => {
    // Reset button state
    if (window.ScannerUI && window.ScannerUI.resetFetchButton) {
      window.ScannerUI.resetFetchButton();
    }
  });
}

/**
 * Handle successful barcode scan
 */
function handleSuccessfulScan(isbn) {
  const now = Date.now();
  
  // Prevent duplicate processing of the same scan
  if (lastProcessedScan === isbn && (now - lastProcessedTime) < 10000) {
    console.log('Duplicate scan detected, ignoring:', isbn);
    return;
  }
  
  // Update tracking
  lastProcessedScan = isbn;
  lastProcessedTime = now;
  
  // Update ISBN field
  const isbnField = document.getElementById('isbn');
  if (isbnField) {
    isbnField.value = isbn;
  }
  
  // Show success notification
  if (window.ScannerUI && window.ScannerUI.showNotification) {
    window.ScannerUI.showNotification(`ISBN scanned: ${isbn}`, 'success');
  }
  
  // Auto-fetch book data if available (only once)
  if (typeof autofetchBookData === 'function') {
    // Use a longer delay to prevent rapid repeated calls
    setTimeout(() => {
      autofetchBookData();
    }, 1500);
  }
}

/**
 * Handle scan error
 */
function handleScanError(error) {
  // Don't log or show notifications for normal "no barcode found" errors
  if (error.name === 'NotFoundException' || 
      error.name === 'NoMultiFormatReader' ||
      error.message.includes('No MultiFormat Readers')) {
    return;
  }
  
  console.error('Scan error:', error);
  
  // Show error notification only for actual errors
  if (window.ScannerUI && window.ScannerUI.showNotification) {
    window.ScannerUI.showNotification(
      `Scan failed: ${error.message || 'Unknown error'}`, 
      'error'
    );
  }
}

/**
 * Initialize event listeners
 */
function initializeDataModule() {
  // Add event listener to fetch button
  const fetchBtn = document.getElementById('fetchBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', autofetchBookData);
  }
  
  // Add event listener to ISBN field for Enter key
  const isbnField = document.getElementById('isbn');
  if (isbnField) {
    isbnField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        autofetchBookData();
      }
    });
  }
}

// Export functions to global scope
window.ScannerData = {
  autofetchBookData,
  handleSuccessfulScan,
  handleScanError,
  initializeDataModule
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDataModule);
} else {
  initializeDataModule();
} 