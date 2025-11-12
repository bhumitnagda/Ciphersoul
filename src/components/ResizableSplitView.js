import React, { useState, useCallback, useEffect, useRef } from "react";

const ResizableSplitView = ({
  left: Left,
  right: Right,
  initialLeftWidth = 50,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const wrapperRef = useRef(null);

  const startResizing = useCallback((e) => {
    // touchstart and mousedown both call this
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const getClientX = (e) =>
    e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;

  const resize = useCallback(
    (e) => {
      if (!isResizing) return;
      const container = wrapperRef.current;
      if (!container) return;
      const clientX = getClientX(e);
      const rect = container.getBoundingClientRect();
      const newWidth = ((clientX - rect.left) / rect.width) * 100;
      if (newWidth >= 12 && newWidth <= 88) {
        setLeftWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      window.addEventListener("touchmove", resize, { passive: false });
      window.addEventListener("touchend", stopResizing);
    }

    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", resize);
      window.removeEventListener("touchend", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div className="editor-viewer-wrapper" ref={wrapperRef}>
      <div
        className="editor-container"
        style={{ width: `${leftWidth}%`, flexBasis: `${leftWidth}%` }}
      >
        {Left}
      </div>

      <div
        className={`resizer ${isResizing ? "resizing" : ""}`}
        onMouseDown={startResizing}
        onTouchStart={startResizing}
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={12}
        aria-valuemax={88}
        aria-valuenow={Math.round(leftWidth)}
      >
        <div className="hit" aria-hidden="true" />
        <div className="handle" aria-hidden="true" />
      </div>

      <div
        className="view-container"
        style={{
          width: `${100 - leftWidth}%`,
          flexBasis: `${100 - leftWidth}%`,
        }}
      >
        {Right}
      </div>
    </div>
  );
};

export default ResizableSplitView;
