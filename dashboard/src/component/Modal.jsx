// Modal.js
import React from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Return Process</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            &times;
          </button>
        </div>
        <div>{children}</div>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Modal;
