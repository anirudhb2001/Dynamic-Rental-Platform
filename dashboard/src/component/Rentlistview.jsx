import React from "react";
import { LuShoppingCart } from "react-icons/lu";

const Rentlistview = ({
  id,
  price,
  price_list,
  brand,
  name,
  status,
  quantity,
}) => {
  return (
    <div className="border border-gray-100 w-full min-w-[230px] min-h-[147px] bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col font-barlow overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center p-3 pb-2 border-b border-gray-50/50">
        <p className="text-gray-500 font-medium text-xs">{id}</p>
        <div className="bg-primary/10 rounded-full p-2">
          <LuShoppingCart className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="font-semibold text-gray-800 ml-3 mt-2 truncate w-[220px] mr-2">
        {brand} <span className="text-gray-500 font-medium">{name}</span>
      </p>

      <h4
        className={` ml-3 mt-1 text-sm font-semibold ${
          status === "Available"
            ? "text-emerald-500"
            : status === "Rented"
            ? "text-rose-500"
            : status === "Reserved"
            ? "text-amber-500"
            : status === "Unavailable"
            ? "text-rose-500"
            : "text-slate-500"
        }`}
      >
        {status}
      </h4>

      <div className="flex items-center justify-between mt-auto p-3 bg-gray-50/50">
        <div>
          <span className="font-medium text-xs text-gray-500">{price_list} </span>
          <span className="font-bold text-gray-900 ml-1">₹{price}</span>
        </div>
        <div className="flex text-xs items-center justify-center bg-gray-200 text-gray-700 gap-1.5 w-auto h-[22px] rounded-md px-2 font-medium">
          <span>
            Qty: <span className="font-bold">{quantity}</span>
          </span>
        </div>
        
      </div>
    </div>
  );
};

export default Rentlistview;
