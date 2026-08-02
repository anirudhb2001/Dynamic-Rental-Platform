import React, { useState, useEffect } from "react";
import { getSalesInvoices } from "../../services/api";
import { LuCreditCard, LuCalendar, LuUser, LuIndianRupee } from "react-icons/lu";

const InvoiceList = ({ selectedHotelProperty }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await getSalesInvoices(selectedHotelProperty);
        setInvoices(data || []);
      } catch (error) {
        console.error("Error fetching sales invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [selectedHotelProperty]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Draft": return "bg-slate-100 text-slate-700";
      case "Unpaid": return "bg-rose-100 text-rose-700";
      case "Paid": return "bg-emerald-100 text-emerald-700";
      case "Partly Paid": return "bg-amber-100 text-amber-700";
      case "Overdue": return "bg-red-100 text-red-700";
      case "Cancelled": return "bg-slate-200 text-slate-600";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800">Invoices & Payments</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center opacity-60">
          <LuCreditCard className="w-16 h-16 mb-4 text-slate-400" />
          <p className="text-lg font-medium text-slate-600">No Invoices found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{inv.name}</td>
                    <td className="p-4 text-slate-700 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <LuUser className="w-4 h-4" />
                      </div>
                      {inv.customer}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <LuCalendar className="text-slate-400" />
                        {inv.posting_date}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1">
                        <LuIndianRupee className="w-4 h-4 text-slate-500" />
                        {inv.grand_total?.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-rose-600">
                      {inv.outstanding_amount > 0 ? (
                        <div className="flex items-center gap-1">
                          <LuIndianRupee className="w-4 h-4" />
                          {inv.outstanding_amount?.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
