export const normalizeScanResult = (input: any): { success: boolean; barcode?: string; error?: string } => {
  if (!input && input !== 0) return { success: false, error: 'No result' };
  try {
    // If already in expected shape
    if (typeof input === 'object' && input.success && input.barcode) {
      return { success: true, barcode: input.barcode };
    }

    // Array of barcode objects
    if (Array.isArray(input) && input.length > 0) {
      const b = input[0];
      const code = b?.rawValue ?? b?.displayValue ?? b?.value ?? b?.text ?? null;
      if (code) return { success: true, barcode: String(code) };
    }

    // Object with barcodes array
    if (input && Array.isArray(input.barcodes) && input.barcodes.length > 0) {
      const b = input.barcodes[0];
      const code = b?.rawValue ?? b?.displayValue ?? b?.value ?? b?.text ?? null;
      if (code) return { success: true, barcode: String(code) };
    }

    // Single barcode-like object
    if (input && (input.rawValue || input.displayValue || input.value || input.text)) {
      const code = input.rawValue ?? input.displayValue ?? input.value ?? input.text;
      return { success: true, barcode: String(code) };
    }

    // Plain string
    if (typeof input === 'string' && input.length > 0) {
      return { success: true, barcode: input };
    }

    if (input && (input.error || input.message)) {
      return { success: false, error: input.error ?? input.message };
    }

    return { success: false, error: 'Unrecognized native scanner result shape' };
  } catch (e: any) {
    return { success: false, error: e?.message ?? String(e) };
  }
};

export default normalizeScanResult;
