import React, { useState, useEffect } from "react";
import { createConsolidatedSalesInvoice } from "../../services/api";

const ReservationDetails = ({ isOpen, onClose, bookingName, addToast, onExtendClick, onInvoiceCreated }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && bookingName) {
      fetchDetails();
    }
  }, [isOpen, bookingName]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [res, paymentRes] = await Promise.all([
        fetch(`/api/resource/Booking Entry/${bookingName}`),
        fetch(`/api/resource/Payment Entry?filters=[["custom_booking_entry", "=", "${bookingName}"]]&fields=["name","posting_date","paid_amount","payment_type"]`)
      ]);
      const data = await res.json();
      const paymentData = await paymentRes.json();
      
      setDetails({
        ...data.data,
        payment_entries: paymentData.data || []
      });
    } catch (err) {
      console.error(err);
      addToast("Failed to load reservation details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setIsSubmitting(true);
    try {
      const res = await createConsolidatedSalesInvoice(bookingName);
      addToast(`Consolidated Sales Invoice ${res.sales_invoice_name} created!`, "success");
      onInvoiceCreated();
      onClose();
    } catch (err) {
      addToast(err.toString(), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !bookingName) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-slate-800">Reservation Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading details...</div>
        ) : details ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <p className="text-sm text-slate-500">Booking ID</p>
                <p className="font-semibold text-slate-800">{details.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <p className="font-semibold text-primary">{details.status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-semibold text-slate-800">{details.customer_name || details.customer}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Venue</p>
                <p className="font-semibold text-slate-800">{details.venue}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Event Type</p>
                <p className="font-semibold text-slate-800">{details.event_type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Event Date</p>
                <p className="font-semibold text-slate-800">{details.event_date}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Time Slot</p>
                <p className="font-semibold text-slate-800">{details.time_slot}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Original Sales Order</p>
                <p className="font-semibold text-slate-800">{details.sales_order || 'N/A'}</p>
              </div>
            </div>

            {/* Extension History */}
            {details.reservation_extensions && details.reservation_extensions.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-slate-800 mb-3">Extension History</h3>
                <div className="space-y-3">
                  {details.reservation_extensions.map((ext, idx) => (
                    <div key={ext.name || idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{ext.extension_date} | {ext.time_slot}</p>
                        <p className="text-xs text-slate-500">SO: {ext.sales_order} ({ext.status})</p>
                        {ext.notes && <p className="text-xs text-slate-500 mt-1">Note: {ext.notes}</p>}
                      </div>
                      <div className="font-bold text-slate-800">
                        {ext.amount ? `₹${ext.amount}` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment History */}
            {details.payment_entries && details.payment_entries.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-slate-800 mb-3">Payment History</h3>
                <div className="space-y-3">
                  {details.payment_entries.map((payment, idx) => (
                    <div key={payment.name || idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{payment.name}</p>
                        <p className="text-xs text-slate-500">{payment.posting_date} • {payment.payment_type}</p>
                      </div>
                      <div className="font-bold text-emerald-600">
                        {payment.paid_amount ? `₹${payment.paid_amount.toLocaleString()}` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => {
                  onClose();
                  onExtendClick(details);
                }} 
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
              >
                Extend Reservation
              </button>
              <button 
                onClick={handleCreateInvoice} 
                disabled={isSubmitting || details.status === 'Cancelled'}
                className={`px-5 py-2.5 rounded-xl font-semibold text-white transition-colors ${
                  isSubmitting || details.status === 'Cancelled' ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                }`}
              >
                {isSubmitting ? "Creating..." : "Create Final Invoice"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-red-500">Failed to load details.</div>
        )}
      </div>
    </div>
  );
};

export default ReservationDetails;
