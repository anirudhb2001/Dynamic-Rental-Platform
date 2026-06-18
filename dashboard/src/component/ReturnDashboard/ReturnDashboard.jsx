import React, { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { VITE_AUTHENTICATION } from "../../../../constants.js";
import ReturnCard from "./ReturnCard";
import { LuCalendarClock, LuAlertCircle, LuClipboardCheck, LuFileText, LuCheckCircle2, LuPackage } from "react-icons/lu";

const ReturnDashboard = ({ 
  addToast, portalMode, branding,
  filterCustomer, filterWarehouse, filterStatus, filterInvoiceStatus, 
  fromDate, toDate, searchQuery
}) => {
  const [stats, setStats] = useState({
    active_rentals: 0,
    due_today: 0,
    overdue: 0,
    return_pending: 0,
    completed_today: 0
  });
  
  const [activeTab, setActiveTab] = useState("Active Rentals");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = ["Active Rentals", "Due Today", "Overdue", "Return Pending", "Completed"];

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${VITE_AUTHENTICATION}/api/method/rental_platform.web_api.rental_return_admin_api.get_return_dashboard_stats`, { withCredentials: true });
      if (!res.data.error) setStats(res.data.message || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${VITE_AUTHENTICATION}/api/method/rental_platform.web_api.rental_return_admin_api.get_admin_return_bookings`, {
        params: { tab: activeTab },
        withCredentials: true
      });
      if (!res.data.error) setBookings(res.data.message || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    fetchBookings();
  }, [activeTab]);

  const handleActionComplete = () => {
    fetchStats();
    fetchBookings();
  };

  const getFilteredBookings = () => {
    return bookings.filter(b => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCustomer = b.customer_name?.toLowerCase().includes(query);
        const matchesAsset = b.asset_name?.toLowerCase().includes(query);
        const matchesId = b.name?.toLowerCase().includes(query);
        if (!matchesCustomer && !matchesAsset && !matchesId) return false;
      }
      
      // Customer
      if (filterCustomer && b.customer_name !== filterCustomer) return false;
      
      // Warehouse
      if (filterWarehouse && b.warehouse !== filterWarehouse) return false;
      
      // Status (maps to ui_status or booking_status)
      if (filterStatus) {
        if (b.ui_status !== filterStatus && b.booking_status !== filterStatus) return false;
      }
      
      // Invoice Status (maps to Paid / Unpaid etc)
      if (filterInvoiceStatus) {
        if (b.invoice_status !== filterInvoiceStatus) return false;
      }
      
      // Dates
      if (fromDate) {
        const pDate = dayjs(fromDate).startOf('day');
        const bStart = dayjs(b.start_date || b.creation).startOf('day');
        if (bStart.isBefore(pDate)) return false;
      }
      if (toDate) {
        const rDate = dayjs(toDate).endOf('day');
        const bEnd = dayjs(b.end_date).endOf('day');
        if (bEnd.isAfter(rDate)) return false;
      }
      
      return true;
    });
  };

  const filteredBookings = getFilteredBookings();

  return (
    <div className="w-full flex flex-col h-full overflow-y-auto bg-slate-50/50 p-6 rounded-3xl">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard title="Active Rentals" count={stats.active_rentals} icon={<LuPackage />} color="text-indigo-500" bg="bg-indigo-50" />
        <KpiCard title="Due Today" count={stats.due_today} icon={<LuCalendarClock />} color="text-blue-500" bg="bg-blue-50" />
        <KpiCard title="Overdue" count={stats.overdue} icon={<LuAlertCircle />} color="text-red-500" bg="bg-red-50" />
        <KpiCard title="Return Pending" count={stats.return_pending} icon={<LuClipboardCheck />} color="text-orange-500" bg="bg-orange-50" />
        <KpiCard title="Completed Today" count={stats.completed_today} icon={<LuCheckCircle2 />} color="text-green-500" bg="bg-green-50" />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-slate-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === tab ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-200"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Booking List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map(booking => (
            <ReturnCard 
                key={booking.name} 
                booking={booking} 
                onActionComplete={handleActionComplete} 
                addToast={addToast} 
            />
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-slate-500 font-medium">No bookings found in this category.</div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ title, count, icon, color, bg }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${bg} ${color} text-2xl`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-slate-900">{count || 0}</h3>
    </div>
  </div>
);

export default ReturnDashboard;
