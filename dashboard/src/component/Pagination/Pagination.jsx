// Pagination.jsx
import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange, selectedPriceList }) => {
  return (
    <div className="flex items-center justify-center space-x-2 p-4">
      <button
        onClick={() => onPageChange(currentPage - 1, selectedPriceList)}
        disabled={currentPage === 1}
        className={`px-2 py-2 text-sm font-medium border rounded-full transition-all 
          ${
            currentPage === 1
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-primary text-white shadow-md hover:bg-primary-hover"
          }
        `}
      >
        Prev
      </button>
      <span className="text-sm text-gray-700">
        Page <span className="font-semibold">{currentPage}</span> of{" "}
        <span className="font-semibold">{totalPages}</span>
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1, selectedPriceList)}
        disabled={currentPage === totalPages}
        className={`px-2 py-2 text-sm font-medium border rounded-full transition-all 
          ${
            currentPage === totalPages
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-primary text-white shadow-md hover:bg-primary-hover"
          }
        `}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
