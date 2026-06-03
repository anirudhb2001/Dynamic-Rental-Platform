import React from "react";
import { IoMdClose } from "react-icons/io";

const QuotationSubmitModal = ({
  isOpen,
  onClose,
  onConfirm,
  onDelete,
  title,
  message,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md">
        <button
          className="absolute top-2 right-2 bg-transparent border-none text-lg cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-gray-200"
          onClick={onClose}
        >
          <IoMdClose />
        </button>

        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              No
            </button>
          )}
          <button
            onClick={onConfirm}
            className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary-hover transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotationSubmitModal;
