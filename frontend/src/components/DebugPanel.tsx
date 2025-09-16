mybibliotheca\frontend\src\components\DebugPanel.tsx
import React, { useState } from "react";

/**
 * DebugPanel
 * A reusable, toggleable visual debug panel for displaying arbitrary debug info.
 *
 * Usage:
 *   <DebugPanel debugInfo={{ foo: bar, state, props }} title="AddBookPage Debug" />
 *
 * Props:
 *   - debugInfo: Record<string, any> | any[] | any
 *   - title?: string
 *   - defaultOpen?: boolean
 *   - position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
 *   - style?: React.CSSProperties
 */
interface DebugPanelProps {
  debugInfo: Record<string, any> | any[] | any;
  title?: string;
  defaultOpen?: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  style?: React.CSSProperties;
}

const positionStyles: Record<string, React.CSSProperties> = {
  "bottom-right": {
    bottom: 16,
    right: 16,
  },
  "bottom-left": {
    bottom: 16,
    left: 16,
  },
  "top-right": {
    top: 16,
    right: 16,
  },
  "top-left": {
    top: 16,
    left: 16,
  },
};

const DebugPanel: React.FC<DebugPanelProps> = ({
  debugInfo,
  title = "Debug Panel",
  defaultOpen = false,
  position = "bottom-right",
  style = {},
}) => {
  const [open, setOpen] = useState(defaultOpen);

  // Stringify debug info for display/copy
  let debugString: string;
  try {
    debugString = JSON.stringify(debugInfo, null, 2);
  } catch (e) {
    debugString = String(debugInfo);
  }

  // Copy to clipboard
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(debugString);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        width: open ? 380 : 48,
        minHeight: open ? 180 : 48,
        maxHeight: "80vh",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        borderRadius: 12,
        background: "#18181b",
        color: "#fafafa",
        fontSize: 13,
        ...positionStyles[position],
        ...style,
      }}
      tabIndex={-1}
      aria-label="Debug Panel"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: open ? "#fbbf24" : "#27272a",
          color: open ? "#18181b" : "#fafafa",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: 18,
          boxShadow: open ? "0 0 0 2px #fbbf24" : undefined,
          zIndex: 2,
        }}
        title={open ? "Hide Debug Panel" : "Show Debug Panel"}
        aria-label={open ? "Hide Debug Panel" : "Show Debug Panel"}
      >
        {open ? "×" : "🐞"}
      </button>

      {/* Panel Content */}
      {open && (
        <div
          style={{
            padding: "48px 16px 16px 16px",
            overflowY: "auto",
            maxHeight: "70vh",
            wordBreak: "break-word",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🐞</span>
            <span>{title}</span>
            <button
              onClick={handleCopy}
              style={{
                marginLeft: "auto",
                background: "#27272a",
                color: "#fafafa",
                border: "none",
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
              title="Copy debug info"
            >
              Copy
            </button>
          </div>
          <pre
            style={{
              background: "#27272a",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: "50vh",
              overflowX: "auto",
              overflowY: "auto",
              margin: 0,
            }}
          >
            {debugString}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
