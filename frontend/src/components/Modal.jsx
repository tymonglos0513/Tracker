import React from "react";

export default function Modal({
  open,
  title,
  children,
  onClose,
  onSave,
  hideFooter = false,
  wide = false, // ✅ new prop
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-auto">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 transition-all duration-200 ${
          wide ? "w-[90vw] max-w-[90vw]" : "w-96"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="mb-4 max-h-[80vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {!hideFooter && (
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
