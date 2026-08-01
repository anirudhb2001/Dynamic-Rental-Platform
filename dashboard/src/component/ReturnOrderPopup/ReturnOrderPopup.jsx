import React, { useState, useEffect } from "react";
import { getWarehouseList, processReturnBooking, getServiceItem, getBookingEntryItems } from "../../services/api";
import InventoryItem from "./InventoryItem";
import { IoMdClose } from "react-icons/io";

const ReturnOrderPopup = ({
  booking,
  onClose,
  onActionComplete,
  addToast,
}) => {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [acceptedItems, setAcceptedItems] = useState({});
  const [selectedWarehouses, setSelectedWarehouses] = useState({});
  const [itemRemarks, setItemRemarks] = useState({});
  const [additionalCharges, setAdditionalCharges] = useState([]);
  
  const [customerBlackList, setCustomerBlackList] = useState(false);
  const [customerYellowList, setCustomerYellowList] = useState(false);
  const [customerRemarks, setCustomerRemarks] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (booking) {
      setLoading(true);
      fetchDataForPopup();
    }
  }, [booking]);

  const fetchDataForPopup = async () => {
    try {
      const [warehouseData, serviceData, itemsData] = await Promise.all([
        getWarehouseList(),
        getServiceItem(),
        getBookingEntryItems(booking.name)
      ]);
      setWarehouses(warehouseData || []);
      setServiceItems(serviceData || []);
      setItems(itemsData?.items || []);
    } catch (err) {
      addToast(err.message || "Failed to load return data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptToggle = (index) => {
    setAcceptedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleWarehouseChange = (index, value) => {
    setSelectedWarehouses((prev) => ({ ...prev, [index]: value }));
  };

  const handleRemarkChange = (index, value) => {
    setItemRemarks((prev) => ({ ...prev, [index]: value }));
  };

  const handleAddCharge = () => {
    setAdditionalCharges([...additionalCharges, { item_code: "", rate: "" }]);
  };

  const handleChargeChange = (index, field, value) => {
    const updated = [...additionalCharges];
    updated[index][field] = value;
    setAdditionalCharges(updated);
  };

  const handleRemoveCharge = (index) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

  const getCSRFToken = () => {
    return typeof window !== "undefined" && window.csrf_token
      ? window.csrf_token
      : "";
  };

  const handleSubmit = async () => {
    const acceptedCount = Object.values(acceptedItems).filter(Boolean).length;
    if (acceptedCount === 0 && additionalCharges.length === 0) {
      addToast("Please accept items to return or add charges.", "error");
      return;
    }

    const itemWarehousesList = [];
    const formattedItemRemarks = [];

    for (let i = 0; i < items.length; i++) {
      if (acceptedItems[i]) {
        itemWarehousesList.push({
          rental_item_id: items[i].rental_item_id,
          quantity: items[i].stock_quantity,
          warehouse: selectedWarehouses[i] || "",
          serial_no: items[i].serial_no || "",
        });

        if (itemRemarks[i]) {
          formattedItemRemarks.push({
            item_name: items[i].item_name,
            remark: itemRemarks[i]
          });
        }
      }
    }

    try {
      setSubmitting(true);
      const response = await processReturnBooking(
        booking.name,
        additionalCharges.filter(c => c.item_code),
        itemWarehousesList,
        customerBlackList,
        customerYellowList,
        customerRemarks,
        formattedItemRemarks,
        getCSRFToken()
      );

      if (response && response.sales_invoice_name) {
        addToast(`Return Processed. Opening Invoice ${response.sales_invoice_name}`, "success");
        // Open the Draft Sales Invoice in Frappe
        window.open(`/app/sales-invoice/${response.sales_invoice_name}`, "_blank");
        
        onClose();
        if(onActionComplete) onActionComplete();
      } else {
        addToast("Processed return, but no invoice returned.", "warning");
        onClose();
      }
    } catch (err) {
      addToast(err.message || "Failed to process return.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Return Processing</h2>
            <p className="text-sm text-slate-500 font-medium">{booking?.name} • {booking?.customer_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <IoMdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-slate-500">Loading details...</p>
            </div>
          ) : (
            <>
              {/* Items Section */}
              <section>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Items Pending Return</h3>
                {items.length === 0 ? (
                  <p className="text-slate-500 text-sm">No items pending return.</p>
                ) : (
                  items.map((item, index) => (
                    <InventoryItem
                      key={index}
                      item={item}
                      index={index}
                      warehouses={warehouses}
                      accepted={!!acceptedItems[index]}
                      selectedWarehouse={selectedWarehouses[index]}
                      remark={itemRemarks[index]}
                      onAcceptToggle={handleAcceptToggle}
                      onWarehouseChange={handleWarehouseChange}
                      onRemarkChange={handleRemarkChange}
                    />
                  ))
                )}
              </section>

              {/* Additional Charges Section */}
              <section className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Additional Charges</h3>
                  <button onClick={handleAddCharge} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                    + Add Charge
                  </button>
                </div>
                
                <div className="space-y-3">
                  {additionalCharges.map((charge, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select
                        className="flex-1 p-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        value={charge.item_code}
                        onChange={(e) => handleChargeChange(index, "item_code", e.target.value)}
                      >
                        <option value="">Select Service Item</option>
                        {serviceItems.map((item, i) => (
                          <option key={i} value={item.name}>{item.item_name}</option>
                        ))}
                      </select>
                      
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                        <input
                          type="number"
                          className="w-full p-2.5 pl-8 text-sm font-medium border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Amount"
                          value={charge.rate}
                          onChange={(e) => handleChargeChange(index, "rate", e.target.value)}
                        />
                      </div>
                      
                      <button onClick={() => handleRemoveCharge(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <IoMdClose size={20} />
                      </button>
                    </div>
                  ))}
                  {additionalCharges.length === 0 && (
                    <p className="text-sm text-slate-400 font-medium">No additional charges added.</p>
                  )}
                </div>
              </section>

              {/* Customer Flags */}
              <section>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Customer Flags</h3>
                
                <div className="flex flex-col sm:flex-row gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={customerYellowList} onChange={(e) => setCustomerYellowList(e.target.checked)} className="w-4 h-4 text-amber-500 focus:ring-amber-500 rounded border-slate-300" />
                    <span className="text-sm font-semibold text-slate-700">Yellowlist Customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={customerBlackList} onChange={(e) => setCustomerBlackList(e.target.checked)} className="w-4 h-4 text-rose-500 focus:ring-rose-500 rounded border-slate-300" />
                    <span className="text-sm font-semibold text-slate-700">Blacklist Customer</span>
                  </label>
                </div>
                
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows="3"
                  placeholder="Internal remarks regarding the customer (Optional)"
                  value={customerRemarks}
                  onChange={(e) => setCustomerRemarks(e.target.value)}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || submitting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <><span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span> Processing...</>
            ) : (
              "Complete Return & Open Invoice"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnOrderPopup;
