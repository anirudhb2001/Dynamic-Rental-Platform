import React, { useState } from "react";
import dayjs from "dayjs";
import { LuUser, LuPackage, LuCalendar, LuAlertTriangle, LuIndianRupee, LuCheck, LuArrowRight } from "react-icons/lu";
import axios from "axios";
import { VITE_AUTHENTICATION } from "../../../../constants.js";

const ReturnCard = ({ booking, onActionComplete, addToast }) => {
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-700 ring-green-300";
      case "Returned": return "bg-teal-100 text-teal-700 ring-teal-300";
      case "Inspection Pending": return "bg-orange-100 text-orange-700 ring-orange-300";
      case "Settlement Pending": return "bg-purple-100 text-purple-700 ring-purple-300";
      case "Overdue": return "bg-red-100 text-red-700 ring-red-300";
      case "Due Today": return "bg-blue-100 text-blue-700 ring-blue-300";
      case "Reserved": return "bg-indigo-100 text-indigo-700 ring-indigo-300";
      case "Picked Up": return "bg-cyan-100 text-cyan-700 ring-cyan-300";
      default: return "bg-slate-100 text-slate-700 ring-slate-300";
    }
  };

  const getProgressWidth = () => {
    const status = booking.booking_status;
    if (status === "Completed") return "100%";
    if (status === "Returned") return "75%";
    if (status === "Picked Up") return "50%";
    if (status === "Reserved") return "25%";
    return "0%";
  };

  const handleAction = async (actionUrl) => {
    setLoading(true);
    try {
      const res = await axios.post(`${VITE_AUTHENTICATION}${actionUrl}`, 
      { booking_id: booking.name }, { withCredentials: true });
      if (res.data.message && !res.data.error) {
        addToast(res.data.message, "success");
        onActionComplete();
      } else {
        addToast(res.data.error || "Action failed", "error");
      }
    } catch (err) {
      addToast("Server Error", "error");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{booking.name}</span>
          <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center gap-2">
            <LuPackage className="text-slate-400" /> {booking.asset_name}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ring-1 ${getStatusBadge(booking.ui_status)}`}>
          {booking.ui_status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4 flex-grow">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <LuUser className="text-slate-400" /> {booking.customer_name}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <LuCalendar className="text-slate-400" /> {booking.rental_days} Days
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span className="text-slate-400 text-xs font-bold uppercase">Expected:</span> 
          {dayjs(booking.end_date).format("DD MMM, YY")}
        </div>
        {booking.overdue_days > 0 ? (
          <div className="flex items-center gap-2 text-sm font-bold text-red-600">
            <LuAlertTriangle /> Overdue {booking.overdue_days}d
          </div>
        ) : <div />}
        
        {/* Financials */}
        <div className="col-span-2 grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Agreement</span>
                <span className="text-sm font-black text-slate-700 flex items-center"><LuIndianRupee size={12}/>{booking.agreement_amount.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Advance</span>
                <span className="text-sm font-black text-slate-700 flex items-center"><LuIndianRupee size={12}/>{booking.advance_amount.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Balance</span>
                <span className="text-sm font-black text-slate-700 flex items-center"><LuIndianRupee size={12}/>{booking.balance_amount.toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 mb-4">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
          <span>Reserved</span>
          <span>Picked Up</span>
          <span>Returned</span>
          <span>Completed</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-slate-800 h-full transition-all duration-500" style={{ width: getProgressWidth() }}></div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto pt-2">
        {booking.booking_status === "Reserved" && (
            <button 
                onClick={() => handleAction("/api/method/rental_platform.web_api.booking_actions_api.mark_as_picked_up")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
                <LuArrowRight /> {loading ? "Processing..." : "Mark as Picked Up"}
            </button>
        )}
        
        {booking.booking_status === "Picked Up" && (
            <a 
                href={`/app/rental-return/new?booking=${booking.name}`}
                target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
                <LuCheck /> Create Rental Return
            </a>
        )}
        
        {booking.booking_status === "Returned" && (
            <button 
                onClick={() => handleAction("/api/method/rental_platform.web_api.booking_actions_api.mark_as_completed")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
                <LuCheckCircle2 /> {loading ? "Processing..." : "Complete Rental"}
            </button>
        )}
        
        {booking.booking_status === "Completed" && (
            <div className="w-full text-center py-2.5 text-sm font-bold text-slate-400">
                Lifecycle Completed
            </div>
        )}
      </div>
    </div>
  );
};

export default ReturnCard;
