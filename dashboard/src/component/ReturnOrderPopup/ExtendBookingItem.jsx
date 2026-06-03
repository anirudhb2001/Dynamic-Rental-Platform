import React from "react";

const ExtendBookingItem = ({ name }) => {
  return (
    <div className="border-b border-red-500 p-2 bg-white cursor-pointer flex justify-between items-center">
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm">{name}</span>
        </div>
      </div>
    </div>
  );
};

export default ExtendBookingItem;
