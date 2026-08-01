import React from "react";
import { LuCalendar, LuDollarSign, LuClock, LuCheckSquare } from "react-icons/lu";

const ReportsDashboard = ({ allBookingData, financialData }) => {
  // Simple KPI aggregations for demonstration
  const todayEvents = allBookingData?.filter((b) => b.status === "Reserved").length || 0;
  const upcomingEvents = allBookingData?.filter((b) => b.status === "Confirmed").length || 0;
  
  const revenue = financialData?.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) || 0;
  const pendingPayments = financialData?.filter((b) => b.paymentStatus === "Unpaid").length || 0;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <h2 className="text-2xl font-black mb-6">Reports Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-500">Today's Events</p>
            <h3 className="text-2xl font-black text-slate-900">{todayEvents}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
            <LuCalendar size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-500">Upcoming Events</p>
            <h3 className="text-2xl font-black text-slate-900">{upcomingEvents}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
            <LuCheckSquare size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-500">Revenue</p>
            <h3 className="text-2xl font-black text-slate-900">₹{revenue}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <LuDollarSign size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-500">Pending Payments</p>
            <h3 className="text-2xl font-black text-slate-900">{pendingPayments}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
            <LuClock size={24} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold mb-4">Recent Reservations</h3>
        {/* Placeholder for table */}
        <p className="text-slate-500">Table rendering goes here...</p>
      </div>
    </div>
  );
};

export default ReportsDashboard;
