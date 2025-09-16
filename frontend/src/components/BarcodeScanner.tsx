import React, { useState, useEffect, useRef } from "react";
import {
  CameraIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  startBrowserScanner,
  getScannerAvailability,
  stopScanner,
} from "@/services/scannerService";
import { useCapacitorEnv } from "@/utils/CapacitorEnvContext";
import DebugPanel from "./DebugPanel";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface ScannerState {
  isScanning: boolean;
  isNativeAvailable: boolean;
  isBrowserAvailable: boolean;
  error: string | null;
  status: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onError,
  onClose,
  isOpen,
}) => {
  const [scannerState, setScannerState] = useState<ScannerState>({
    isScanning: false,
    isNativeAvailable: false,
    isBrowserAvailable: false,
    error: null,
    status: "Ready to scan",
  });

  const { isNative, platform, isCapacitor, Capacitor } = useCapacitorEnv();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<any>(null);
  const isScannerActiveRef = useRef<boolean>(false);

  // Visual debug state
  const [debugState, setDebugState] = useState<any>({});

  // Check scanner availability on mount and when modal opens
  useEffect(() => {
    const checkAvailability = async () => {
      setScannerState((prev) => ({
        ...prev,
        error: null,
        status: "Ready to scan",
      }));

      const availability = await getScannerAvailability();
      setDebugState((prev: any) => ({
        ...prev,
        availability,
        env: { isNative, platform, isCapacitor, Capacitor },
      }));

      setScannerState((prev) => ({
        ...prev,
        isNativeAvailable: isNative && availability.native,
        isBrowserAvailable: availability.browser,
      }));
    };

    if (isOpen) {
      checkAvailability();
    }
    // eslint-disable-next-line
  }, [isOpen, isNative, platform, isCapacitor, Capacitor]);

  // Start native scanner with direct permission logic (like admin debug button)
  const handleStartNativeScanner = async () => {
    try {
      isScannerActiveRef.current = true;
      setScannerState((prev) => ({
        ...prev,
        isScanning: true,
        status: "Starting native scanner...",
        error: null,
      }));

      const cap = (window as any).Capacitor;
      let perms: any = {};
      let granted = false;
      if (cap && cap.Plugins?.BarcodeScanner) {
        if (typeof cap.Plugins.BarcodeScanner.checkPermissions === "function") {
          perms = await cap.Plugins.BarcodeScanner.checkPermissions();
          granted = perms.camera === "granted";
        }
      }
      setDebugState((prev: any) => ({
        ...prev,
        nativeScanCheckPermissions: perms,
        nativeScanCheckGranted: granted,
        nativeScanCheckTime: new Date().toISOString(),
      }));

      if (!granted) {
        // Try to request permissions
        let reqPerms: any = {};
        let reqGranted = false;
        if (
          cap &&
          cap.Plugins?.BarcodeScanner &&
          typeof cap.Plugins.BarcodeScanner.requestPermissions === "function"
        ) {
          reqPerms = await cap.Plugins.BarcodeScanner.requestPermissions();
          reqGranted = reqPerms.camera === "granted";
        }
        setDebugState((prev: any) => ({
          ...prev,
          nativeScanRequestPermissions: reqPerms,
          nativeScanRequestGranted: reqGranted,
          nativeScanRequestTime: new Date().toISOString(),
        }));
        if (!reqGranted) {
          throw new Error(
            "Camera permission denied. Please enable camera access in your device settings and try again."
          );
        }
      }

      // Permissions granted, start scan
      const result = await cap.Plugins.BarcodeScanner.scan();

      setDebugState((prev: any) => ({
        ...prev,
        lastNativeScanResult: result,
        lastNativeScanTime: new Date().toISOString(),
      }));

      if (!isScannerActiveRef.current) {
        return; // Scanner was cancelled
      }

      if (result.success && result.barcode) {
        onScan(result.barcode);
        setScannerState((prev) => ({
          ...prev,
          status: `Barcode detected: ${result.barcode}`,
          isScanning: false,
        }));
      } else {
        throw new Error(result.error || "Native scanner failed");
      }
    } catch (error) {
      if (!isScannerActiveRef.current) {
        return; // Scanner was cancelled
      }

      setDebugState((prev: any) => ({
        ...prev,
        lastNativeScanError: error,
        lastNativeScanErrorTime: new Date().toISOString(),
      }));

      setScannerState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Native scanner failed",
        isScanning: false,
        status: "Native scanner failed",
      }));
      onError(error instanceof Error ? error.message : "Native scanner failed");
    } finally {
      isScannerActiveRef.current = false;
    }
  };

  // Start browser scanner
  const handleStartBrowserScanner = async () => {
    if (!videoRef.current) {
      setScannerState((prev) => ({
        ...prev,
        error: "Video element not available",
        isScanning: false,
        status: "Browser scanner failed",
      }));
      onError("Video element not available");
      return;
    }

    try {
      isScannerActiveRef.current = true;
      setScannerState((prev) => ({
        ...prev,
        isScanning: true,
        status: "Starting browser scanner...",
        error: null,
      }));

      const result = await startBrowserScanner(
        videoRef.current,
        (status) => {
          if (isScannerActiveRef.current) {
            setScannerState((prev) => ({ ...prev, status }));
          }
        },
        () => !isScannerActiveRef.current // Cancellation check
      );

      if (!isScannerActiveRef.current) {
        return; // Scanner was cancelled
      }

      if (result.success && result.barcode) {
        onScan(result.barcode);
        setScannerState((prev) => ({
          ...prev,
          status: `Barcode detected: ${result.barcode}`,
          isScanning: false,
        }));
      } else {
        throw new Error(result.error || "Browser scanner failed");
      }
    } catch (error) {
      if (!isScannerActiveRef.current) {
        return; // Scanner was cancelled
      }

      console.error("Browser scanner error:", error);
      setScannerState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Browser scanner failed",
        isScanning: false,
        status: "Browser scanner failed",
      }));
      onError(
        error instanceof Error ? error.message : "Browser scanner failed"
      );
    } finally {
      isScannerActiveRef.current = false;
    }
  };

  // Stop browser scanner
  const stopBrowserScanner = () => {
    isScannerActiveRef.current = false;
    stopScanner(); // Stop global scanner

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        // reset() might not exist, try alternative cleanup
        console.log("[BarcodeScanner] ZXing reader cleanup completed");
      }
      codeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start smart scanner (tries native first, then browser)
  const startSmartScanner = async () => {
    try {
      // Log scanner state and environment before starting
      console.log("[BarcodeScanner] startSmartScanner called");
      console.log("[BarcodeScanner] scannerState:", scannerState);
      console.log("[BarcodeScanner] CapacitorEnvContext:", {
        isNative,
        platform,
        isCapacitor,
        Capacitor,
      });

      if (scannerState.isNativeAvailable) {
        console.log("[BarcodeScanner] Using native scanner");
        await handleStartNativeScanner();
      } else if (scannerState.isBrowserAvailable) {
        console.log("[BarcodeScanner] Using browser scanner");
        await handleStartBrowserScanner();
      } else {
        console.log("[BarcodeScanner] No scanner available");
        throw new Error("No scanner available");
      }
    } catch (error) {
      if (!isScannerActiveRef.current) {
        return; // Scanner was cancelled
      }

      console.error("Smart scanner error:", error);
      setScannerState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Scanner failed",
        isScanning: false,
        status: "Scanner failed",
      }));
      onError(error instanceof Error ? error.message : "Scanner failed");
    }
  };

  // Auto-start native scanner on modal open if native available and not already scanning
  useEffect(() => {
    if (
      isOpen &&
      scannerState.isNativeAvailable &&
      !scannerState.isScanning &&
      !scannerState.error
    ) {
      handleStartNativeScanner();
    }
    // eslint-disable-next-line
  }, [
    isOpen,
    scannerState.isNativeAvailable,
    scannerState.isScanning,
    scannerState.error,
  ]);

  // Stop scanner
  const stopLocalScanner = () => {
    stopBrowserScanner();
    setScannerState((prev) => ({
      ...prev,
      isScanning: false,
      status: "Scanner stopped",
      error: null,
    }));
  };

  // Retry permission request
  const handleRetryPermission = () => {
    setScannerState((prev) => ({
      ...prev,
      error: null,
      status: "Retrying permission request...",
    }));
    startSmartScanner();
  };

  // Open app settings if available
  const handleOpenAppSettings = async () => {
    const cap = (window as any).Capacitor;
    if (
      cap &&
      cap.Plugins &&
      cap.Plugins.App &&
      typeof cap.Plugins.App.openSettings === "function"
    ) {
      await cap.Plugins.App.openSettings();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBrowserScanner();
    };
  }, []);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopBrowserScanner();
      setScannerState((prev) => ({
        ...prev,
        isScanning: false,
        error: null,
        status: "Ready to scan",
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Debug Panel for BarcodeScanner */}
      <DebugPanel
        debugInfo={{
          scannerState,
          debugState,
        }}
        title="BarcodeScanner Debug"
        position="bottom-left"
        defaultOpen={false}
      />
      {/* Permission & Native Scanner Debug Output */}
      <div
        style={{
          background: "#222",
          color: "#fff",
          fontSize: 12,
          padding: 8,
          borderRadius: 8,
          margin: 8,
          maxWidth: 400,
          wordBreak: "break-all",
        }}
      >
        <div>
          <b>Permission Debug:</b>
        </div>
        <div>
          Initial checkPermissions:{" "}
          <pre style={{ display: "inline" }}>
            {JSON.stringify(debugState.permissionResult, null, 2)}
          </pre>
        </div>
        <div>
          requestCameraPermissionsEarly:{" "}
          <b>{String(debugState.permissionEarlyResult)}</b>
        </div>
        {debugState.permissionResultAfterDelay && (
          <div>
            After delay checkPermissions:{" "}
            <pre style={{ display: "inline" }}>
              {JSON.stringify(debugState.permissionResultAfterDelay, null, 2)}
            </pre>
            Granted: <b>{String(debugState.permissionGrantedAfterDelay)}</b>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <b>Native Scanner Call Debug:</b>
        </div>
        {debugState.lastNativeScanResult && (
          <div>
            <div>
              <b>lastNativeScanResult:</b>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(debugState.lastNativeScanResult, null, 2)}
              </pre>
            </div>
            <div>
              <b>lastNativeScanTime:</b> {debugState.lastNativeScanTime}
            </div>
          </div>
        )}
        {debugState.lastNativeScanError && (
          <div>
            <div>
              <b>lastNativeScanError:</b>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(debugState.lastNativeScanError, null, 2)}
              </pre>
            </div>
            <div>
              <b>lastNativeScanErrorTime:</b>{" "}
              {debugState.lastNativeScanErrorTime}
            </div>
          </div>
        )}
      </div>
      <div className="modal modal-open">
        <div className="modal-box w-11/12 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <CameraIcon className="w-5 h-5" />
              Barcode Scanner
            </h3>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              disabled={scannerState.isScanning}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Scanner Status */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`badge badge-sm ${
                  scannerState.isScanning
                    ? "badge-warning"
                    : scannerState.error
                    ? "badge-error"
                    : "badge-success"
                }`}
              >
                {scannerState.isScanning
                  ? "Scanning..."
                  : scannerState.error
                  ? "Error"
                  : "Ready"}
              </div>
              <span className="text-sm text-base-content/70">
                {scannerState.status}
              </span>
            </div>
            {/* Scanner Availability */}
            <div className="flex gap-2 mb-4">
              <div
                className={`badge badge-xs ${
                  scannerState.isNativeAvailable
                    ? "badge-success"
                    : "badge-neutral"
                }`}
              >
                Native:{" "}
                {scannerState.isNativeAvailable ? "Available" : "Unavailable"}
              </div>
              <div
                className={`badge badge-xs ${
                  scannerState.isBrowserAvailable
                    ? "badge-success"
                    : "badge-neutral"
                }`}
              >
                Browser:{" "}
                {scannerState.isBrowserAvailable ? "Available" : "Unavailable"}
              </div>
            </div>
          </div>

          {/* Start Scan Button for manual/browser fallback */}
          {!scannerState.isScanning &&
            !scannerState.error &&
            (!scannerState.isNativeAvailable || platform === "web") && (
              <div className="flex justify-center mb-4">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (scannerState.isNativeAvailable) {
                      handleStartNativeScanner();
                    } else if (scannerState.isBrowserAvailable) {
                      handleStartBrowserScanner();
                    }
                  }}
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Start Scan
                </button>
              </div>
            )}

          {/* Error Display */}
          {scannerState.error && (
            <div className="alert alert-error mb-4">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{scannerState.error}</span>
            </div>
          )}

          {/* Scanner Viewport */}
          <div className="relative bg-black rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              autoPlay
              playsInline
              muted
            />
            {scannerState.isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="scanner-overlay w-64 h-32 border-2 border-primary rounded-lg"></div>
              </div>
            )}
          </div>

          {/* Scanner Controls */}
          <div className="flex flex-wrap gap-2 justify-center">
            {scannerState.isScanning ? (
              <button onClick={stopLocalScanner} className="btn btn-secondary">
                <XMarkIcon className="w-4 h-4 mr-2" />
                Stop Scanner
              </button>
            ) : null}
            {/* Show error controls if permission denied or other error */}
            {scannerState.error && (
              <div className="flex flex-col gap-2 w-full items-center">
                <button
                  onClick={handleRetryPermission}
                  className="btn btn-warning"
                >
                  Retry Permission Request
                </button>
                <button
                  onClick={handleOpenAppSettings}
                  className="btn btn-info"
                >
                  Open App Settings
                </button>
                <button onClick={onClose} className="btn btn-outline btn-error">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Scanner Tips */}
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="w-5 h-5 text-info mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Scanner Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Native App: Best experience with automatic scanning</li>
                  <li>• Browser: Works but may be slower on mobile devices</li>
                  <li>• Point camera at barcode clearly</li>
                  <li>• Ensure good lighting for better detection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BarcodeScanner;
