import React from "react";
import { LuCheck, LuX } from "react-icons/lu";

const InventoryItem = ({ 
  item, 
  index, 
  warehouses, 
  accepted, 
  selectedWarehouse, 
  remark, 
  onAcceptToggle, 
  onWarehouseChange, 
  onRemarkChange 
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl mb-3 shadow-sm transition-all hover:shadow-md">
      {/* Left Details */}
      <div className="flex-1 mb-3 sm:mb-0">
        <h4 className="font-bold text-slate-800 text-base">{item.item_name}</h4>
        <div className="flex gap-4 mt-1">
          {item.serial_no && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              SN: {item.serial_no}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Qty: {item.stock_quantity || 1}
          </span>
        </div>
        
        {accepted && (
            <div className="mt-3">
              <input
                className="w-full sm:w-2/3 border border-slate-300 p-2 text-sm text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Return Remarks (Optional)"
                value={remark || ""}
                onChange={(e) => onRemarkChange(index, e.target.value)}
              />
            </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          className={`flex items-center gap-1 px-4 py-2 text-sm font-bold rounded-lg transition-all border ${
            accepted 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
          }`}
          onClick={() => onAcceptToggle(index)}
        >
          {accepted ? <LuCheck size={16}/> : <LuX size={16}/>}
          {accepted ? "Accepted" : "Accept Return"}
        </button>

        <select
          className={`text-sm px-3 py-2 rounded-lg border font-semibold outline-none transition-all ${
            accepted
              ? "bg-white border-indigo-200 text-indigo-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          value={selectedWarehouse || ""}
          onChange={(e) => onWarehouseChange(index, e.target.value)}
          disabled={!accepted}
        >
          <option value="" disabled>Select Destination...</option>
          {warehouses.map((w, wIndex) => (
            <option key={wIndex} value={w.warehouse_name}>{w.warehouse_name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default InventoryItem;
