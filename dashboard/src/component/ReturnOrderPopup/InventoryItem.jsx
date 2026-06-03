import React, { useState } from "react";

const InventoryItem = ({ name, remark, onRemarkChange, isBundleItem, isReturned}) => {
  const [expanded, setExpanded] = useState(false);

  const handleTextAreaClick = (e) => {
    e.stopPropagation();
  };

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };
  
  return (
    <div className="border-b border-red-500 p-2 bg-white cursor-pointer flex justify-between items-center">
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm">{name}</span>
          {!isBundleItem && !isReturned && (
            <span
              className="text-gray-500 cursor-pointer"
              onClick={toggleExpanded}
            >
              {expanded ? "-" : "+"}
            </span>
          )}
        </div>
        {expanded && !isBundleItem && !isReturned && (
          <div className="mt-2">
            <textarea
              className="w-full border p-1 focus:outline-none focus:ring-2 focus:ring-red-500 bg-[#4B5150] text-sm text-white"
              placeholder="Remarks (Optional)"
              value={remark}
              onChange={(e) => onRemarkChange(name, e.target.value)}
              onClick={handleTextAreaClick}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryItem;
