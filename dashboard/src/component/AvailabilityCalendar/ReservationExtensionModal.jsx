import React, { useState, useEffect } from "react";
import { getTimeSlots, extendVenueReservation, checkVenueAvailability } from "../../services/api";

const ReservationExtensionModal = ({ isOpen, onClose, originalBooking, addToast, onExtensionCreated }) => {
  const [timeSlots, setTimeSlots] = useState([]);

  const [formData, setFormData] = useState({
    booking_name: "",
    extension_date: "",
    time_slot: "",
    amount: "",
    notes: "",
  });

  const [isAvailable, setIsAvailable] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && originalBooking) {
      fetchMasterData();
      setFormData({
        booking_name: originalBooking.name || "",
        extension_date: "",
        time_slot: "",
        amount: "",
        notes: "",
      });
      setIsAvailable(null);
    }
  }, [isOpen, originalBooking]);

  useEffect(() => {
    if (formData.extension_date && formData.time_slot && originalBooking) {
      checkAvailability();
    } else {
      setIsAvailable(null);
    }
  }, [formData.extension_date, formData.time_slot]);

  const fetchMasterData = async () => {
    try {
      const tsList = await getTimeSlots();
      setTimeSlots(tsList || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to load time slots", "error");
    }
  };

  const checkAvailability = async () => {
    setIsChecking(true);
    try {
      const res = await checkVenueAvailability(originalBooking.venue, formData.extension_date, formData.time_slot, originalBooking.name);
      if (res && res.available) {
        setIsAvailable(true);
      } else {
        setIsAvailable(false);
      }
    } catch (err) {
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.extension_date || !formData.time_slot) {
      addToast("Please fill all required fields", "warning");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const amt = formData.amount ? parseFloat(formData.amount) : null;
      await extendVenueReservation({
        booking_name: formData.booking_name,
        extension_date: formData.extension_date,
        time_slot: formData.time_slot,
        amount: amt,
        notes: formData.notes
      });
      addToast("Reservation extended successfully!", "success");
      onExtensionCreated();
      onClose();
    } catch (error) {
      addToast(error.toString(), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !originalBooking) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-slate-800">Extend Reservation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-500">Original Reservation</p>
            <p className="font-semibold text-slate-800">{originalBooking.name} - {originalBooking.customer_name || originalBooking.customer}</p>
            <p className="text-sm text-slate-600">Venue: {originalBooking.venue}</p>
            <p className="text-sm text-slate-600">Date: {originalBooking.event_date} | Slot: {originalBooking.time_slot}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Extension Date *</label>
              <input type="date" name="extension_date" value={formData.extension_date} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Extension Time Slot *</label>
              <select name="time_slot" value={formData.time_slot} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="">Select Time Slot</option>
                {timeSlots.map(ts => (
                  <option key={ts.name} value={ts.name}>{ts.name}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.extension_date && formData.time_slot && (
            <div className={`p-3 rounded-xl text-sm font-medium ${isChecking ? 'bg-slate-100 text-slate-600' : isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {isChecking ? "Checking availability..." : isAvailable ? "✅ Venue is available for the extension." : "❌ Venue is already booked for this slot."}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Charges (Optional)</label>
            <input type="number" name="amount" placeholder="Leave empty for default standard rate" value={formData.amount} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Reason / Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none"></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
            <button 
              onClick={handleSubmit} 
              disabled={!isAvailable || isChecking || isSubmitting}
              className={`px-5 py-2.5 rounded-xl font-semibold text-white transition-colors ${
                (!isAvailable || isChecking || isSubmitting) ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 shadow-md'
              }`}
            >
              {isSubmitting ? "Submitting..." : "Extend Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationExtensionModal;
