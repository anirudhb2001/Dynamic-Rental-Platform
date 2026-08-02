import React, { useState, useEffect } from "react";
import { getSalesOrders } from "../../services/api";
import { LuShoppingCart, LuCalendar, LuUser, LuIndianRupee } from "react-icons/lu";

const SalesOrderList = ({ selectedHotelProperty }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getSalesOrders(selectedHotelProperty);
        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching sales orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [selectedHotelProperty]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Draft": return "bg-slate-100 text-slate-700";
      case "To Deliver and Bill":
      case "To Bill": return "bg-amber-100 text-amber-700";
      case "Completed": return "bg-emerald-100 text-emerald-700";
      case "Cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800">Sales Orders</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center opacity-60">
          <LuShoppingCart className="w-16 h-16 mb-4 text-slate-400" />
          <p className="text-lg font-medium text-slate-600">No Sales Orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{order.name}</td>
                    <td className="p-4 text-slate-700 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <LuUser className="w-4 h-4" />
                      </div>
                      {order.customer}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <LuCalendar className="text-slate-400" />
                        {order.transaction_date}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1">
                        <LuIndianRupee className="w-4 h-4 text-slate-500" />
                        {order.grand_total?.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {order.status}
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

export default SalesOrderList;
