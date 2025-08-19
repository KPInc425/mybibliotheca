import { api } from '@/api/client';

export interface BookData {
  title: string;
  author: string;
  isbn: string;
  description?: string;
  published_date?: string;
  page_count?: number;
  categories?: string;
  publisher?: string;
  language?: string;
  format?: string;
  cover_url?: string;
  average_rating?: number;
  rating_count?: number;
}

export interface BookDataResponse {
  success: boolean;
  data?: BookData;
  error?: string;
}

/**
 * Fetch book data from ISBN using the configured API client
 */
export const fetchBookData = async (isbn: string): Promise<BookDataResponse> => {
  try {
    console.log('[BookDataService] Fetching book data for ISBN:', isbn);
    
    const response = await api.books.lookup(isbn);
    
    console.log('[BookDataService] Raw API response:', response);
    
    if (response.success && response.data && response.data.title) {
      console.log('[BookDataService] Book data fetched successfully:', response.data);
      return {
        success: true,
        data: response.data
      };
    } else {
      console.log('[BookDataService] Response validation failed:', {
        success: response.success,
        hasData: !!response.data,
        hasTitle: response.data?.title,
        error: response.error
      });
      throw new Error(response.error || 'No book data found for this ISBN');
    }
  } catch (error) {
    console.error('[BookDataService] Error fetching book data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch book data'
    };
  }
};

/**
 * Validate ISBN format
 */
export const validateISBN = (isbn: string): boolean => {
  // Remove hyphens and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Check if it's a valid ISBN-10 or ISBN-13
  if (cleanISBN.length === 10) {
    return /^\d{9}[\dX]$/.test(cleanISBN);
  } else if (cleanISBN.length === 13) {
    return /^\d{13}$/.test(cleanISBN);
  }
  
  return false;
};

/**
 * Format ISBN for display
 */
export const formatISBN = (isbn: string): string => {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  if (cleanISBN.length === 10) {
    return `${cleanISBN.slice(0, 1)}-${cleanISBN.slice(1, 4)}-${cleanISBN.slice(4, 9)}-${cleanISBN.slice(9)}`;
  } else if (cleanISBN.length === 13) {
    return `${cleanISBN.slice(0, 3)}-${cleanISBN.slice(3, 4)}-${cleanISBN.slice(4, 8)}-${cleanISBN.slice(8, 12)}-${cleanISBN.slice(12)}`;
  }
  
  return isbn;
};

/**
 * Extract ISBN from barcode
 */
export const extractISBNFromBarcode = (barcode: string): string => {
  // Remove any non-digit characters except X (for ISBN-10)
  const cleanBarcode = barcode.replace(/[^0-9X]/gi, '');
  
  // Check if it's a valid ISBN
  if (validateISBN(cleanBarcode)) {
    return cleanBarcode;
  }
  
  // If not a valid ISBN, return the original barcode
  return barcode;
};
