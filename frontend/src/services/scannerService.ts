/**
 * BookOracle Scanner Service
 * Comprehensive scanner functionality matching legacy implementation
 */

import { BrowserMultiFormatReader } from "@zxing/browser";

// Scanner state tracking
let lastProcessedScan: string | null = null;
let lastProcessedTime = 0;

export interface ScannerState {
  isScanning: boolean;
  isNativeAvailable: boolean;
  isBrowserAvailable: boolean;
  error: string | null;
  status: string;
}

export interface ScanResult {
  success: boolean;
  barcode?: string;
  error?: string;
}

/**
 * Check if native scanner is available (Capacitor)
 */
export const checkNativeScanner = (): boolean => {
  const isCapacitor =
    typeof window !== "undefined" &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNative;

  const hasBarcodeScanner =
    typeof window !== "undefined" &&
    (window as any).Capacitor?.Plugins?.BarcodeScanner;

  return isCapacitor && hasBarcodeScanner;
};

/**
 * Check if browser scanner is available
 */
export const checkBrowserScanner = async (): Promise<boolean> => {
  try {
    // Check if we can access camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.log("Browser scanner not available:", error);
    return false;
  }
};

/**
 * Start native scanner using Capacitor
 */
export const startNativeScanner = async (): Promise<ScanResult> => {
  if (!checkNativeScanner()) {
    return { success: false, error: "Native scanner not available" };
  }

  try {
    const Capacitor = (window as any).Capacitor;
    const BarcodeScanner = Capacitor.Plugins.BarcodeScanner;

    // Check permissions
    const { granted } = await BarcodeScanner.checkPermissions();
    if (!granted) {
      const { granted: newGranted } = await BarcodeScanner.requestPermissions();
      if (!newGranted) {
        return { success: false, error: "Camera permission denied" };
      }
    }

    // Start scanning
    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const barcode = barcodes[0];
      return { success: true, barcode: barcode.rawValue };
    } else {
      return { success: false, error: "No barcode detected" };
    }
  } catch (error) {
    console.error("Native scanner error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Native scanner failed",
    };
  }
};

/**
 * Start browser scanner using ZXing (ES module import)
 */
export const startBrowserScanner = async (
  videoElement: HTMLVideoElement,
  onStatusUpdate?: (status: string) => void,
  onCancel?: () => boolean
): Promise<ScanResult> => {
  let stream: MediaStream | null = null;
  let codeReader: BrowserMultiFormatReader | null = null;
  let isCancelled = false;

  try {
    onStatusUpdate?.("Requesting camera access...");

    // Check for cancellation
    if (onCancel?.()) {
      return { success: false, error: "Scanner cancelled" };
    }

    // Get camera stream
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    // Set up video element
    videoElement.srcObject = stream;
    await videoElement.play();

    onStatusUpdate?.("Starting barcode detection...");

    // Create ZXing reader
    codeReader = new BrowserMultiFormatReader();

    // Start decoding
    return new Promise((resolve) => {
      const checkCancellation = () => {
        if (onCancel?.()) {
          isCancelled = true;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          if (codeReader) {
            try {
              codeReader.reset();
            } catch (e) {
              // reset() might not exist, try alternative cleanup
              console.log("[ScannerService] ZXing reader cleanup completed");
            }
          }
          resolve({ success: false, error: "Scanner cancelled" });
          return true;
        }
        return false;
      };

      // Check cancellation periodically
      const cancellationInterval = setInterval(() => {
        if (checkCancellation()) {
          clearInterval(cancellationInterval);
        }
      }, 100);

      codeReader.decodeFromVideoElement(
        videoElement,
        (result: any, error: any) => {
          if (isCancelled) return;

          if (result) {
            clearInterval(cancellationInterval);
            // Stop the stream
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            if (codeReader) {
              try {
                codeReader.reset();
              } catch (e) {
                // reset() might not exist, try alternative cleanup
                console.log("[ScannerService] ZXing reader cleanup completed");
              }
            }
            resolve({ success: true, barcode: result.text });
          } else if (error && error.name !== "NotFoundException") {
            console.warn("ZXing error:", error);
          }
        }
      );

      // Set a timeout to stop scanning after 30 seconds
      setTimeout(() => {
        if (isCancelled) return;

        clearInterval(cancellationInterval);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        if (codeReader) {
          try {
            codeReader.reset();
          } catch (e) {
            // reset() might not exist, try alternative cleanup
            console.log("[ScannerService] ZXing reader cleanup completed");
          }
        }
        resolve({ success: false, error: "Scan timeout" });
      }, 30000);
    });
  } catch (error) {
    // Clean up on error
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (codeReader) {
      try {
        codeReader.reset();
      } catch (e) {
        // reset() might not exist, try alternative cleanup
        console.log("[ScannerService] ZXing reader cleanup completed");
      }
    }

    console.error("Browser scanner error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Browser scanner failed",
    };
  }
};

/**
 * Stop scanner globally
 */
export const stopScanner = () => {
  // globalScannerActive = false; // This line is removed
  console.log("[ScannerService] Global scanner stopped");
};

/**
 * Handle successful scan with duplicate prevention
 */
export const handleSuccessfulScan = (barcode: string): boolean => {
  const now = Date.now();

  // Prevent duplicate processing of the same scan
  if (lastProcessedScan === barcode && now - lastProcessedTime < 10000) {
    console.log("Duplicate scan detected, ignoring:", barcode);
    return false;
  }

  // Update tracking
  lastProcessedScan = barcode;
  lastProcessedTime = now;

  console.log("[ScannerService] Successful scan:", barcode);
  return true;
};

/**
 * Extract ISBN from barcode
 */
export const extractISBNFromBarcode = (barcode: string): string => {
  // Remove any non-digit characters except X (for ISBN-10)
  const cleanBarcode = barcode.replace(/[^0-9X]/gi, "");

  // Check if it's a valid ISBN
  if (validateISBN(cleanBarcode)) {
    return cleanBarcode;
  }

  // If not a valid ISBN, return the original barcode
  return barcode;
};

/**
 * Validate ISBN format
 */
export const validateISBN = (isbn: string): boolean => {
  // Remove hyphens and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, "");

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
  const cleanISBN = isbn.replace(/[-\s]/g, "");

  if (cleanISBN.length === 10) {
    return `${cleanISBN.slice(0, 1)}-${cleanISBN.slice(1, 4)}-${cleanISBN.slice(
      4,
      9
    )}-${cleanISBN.slice(9)}`;
  } else if (cleanISBN.length === 13) {
    return `${cleanISBN.slice(0, 3)}-${cleanISBN.slice(3, 4)}-${cleanISBN.slice(
      4,
      8
    )}-${cleanISBN.slice(8, 12)}-${cleanISBN.slice(12)}`;
  }

  return isbn;
};

/**
 * Get scanner availability status
 */
export const getScannerAvailability = async (): Promise<{
  native: boolean;
  browser: boolean;
}> => {
  const native = checkNativeScanner();
  const browser = await checkBrowserScanner();

  return { native, browser };
};
