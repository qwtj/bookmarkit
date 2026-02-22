import React, { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

// A11Y-02, A11Y-04, PERF-05: Accessible message modal with focus trap, live region
// announcement, Escape key handler, focus restoration, and React.memo.
const MessageModal = ({ message, type = "info", onClose }) => {
  const containerRef = useRef(null);
  useFocusTrap(containerRef);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-100"
      : type === "error"
        ? "bg-red-100"
        : "bg-blue-50";
  const textColor =
    type === "success"
      ? "text-green-800"
      : type === "error"
        ? "text-red-800"
        : "text-blue-800";
  const borderColor =
    type === "success"
      ? "border-green-300"
      : type === "error"
        ? "border-red-300"
        : "border-blue-200";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-modal-title"
        tabIndex={-1}
        className={`rounded-lg shadow-xl max-w-sm w-full m-4 p-6 border ${bgColor} ${borderColor}`}
      >
        {/* A11Y-04: role="alert" for errors, role="status" for success/info */}
        <div role={type === "error" ? "alert" : "status"}>
          <h3 id="message-modal-title" className={`text-xl font-semibold mb-4 ${textColor}`}>
            {type === "success"
              ? "Success!"
              : type === "error"
                ? "Error!"
                : "Information"}
          </h3>
          <p className={`${textColor} mb-6`}>{message}</p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary-bg text-primary-text border border-border rounded-md hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MessageModal);
