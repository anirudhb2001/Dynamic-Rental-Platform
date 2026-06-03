import React from "react";

const ConfirmCheckoutModal = ({ isOpen, onClose, onConfirm, title, message, cancelMessage, confirmMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            {cancelMessage}
          </button>
          <button
            onClick={onConfirm}
            className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-hover transition-colors"
          >
            {confirmMessage}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCheckoutModal;
