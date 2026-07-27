import React from "react";

const ConfirmCheckoutModal = ({ isOpen, onClose, onConfirm, title, message, cancelMessage, confirmMessage, isProcessing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-md ${isProcessing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {cancelMessage}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg shadow-sm transition-colors ${isProcessing ? 'bg-primary/70 text-white cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-hover'}`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </div>
            ) : (
              confirmMessage
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCheckoutModal;
