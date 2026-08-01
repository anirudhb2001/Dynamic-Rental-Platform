import React, { useState, useEffect } from "react";
import { getCustomerLists, getVenues, getEventTypes, getTimeSlots, checkVenueAvailability, createVenueReservation } from "../../services/api";

const ReservationModal = ({ isOpen, onClose, initialDate, addToast, onReservationCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [formData, setFormData] = useState({
    customer: "",
    venue: "",
    event_type: "",
    event_date: initialDate || "",
    time_slot: "",
    guest_count: 0,
    special_instructions: "",
  });

  const [isAvailable, setIsAvailable] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
      setFormData(prev => ({ ...prev, event_date: initialDate || "" }));
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (formData.venue && formData.event_date && formData.time_slot) {
      checkAvailability();
    } else {
      setIsAvailable(null);
    }
  }, [formData.venue, formData.event_date, formData.time_slot]);

  const fetchMasterData = async () => {
    try {
      const custList = await getCustomerLists();
      setCustomers(Array.isArray(custList) ? custList : []);

      const venueList = await getVenues();
      setVenues(Array.isArray(venueList) ? venueList : []);

      const etList = await getEventTypes();
      setEventTypes(Array.isArray(etList) ? etList : []);

      const tsList = await getTimeSlots();
      setTimeSlots(Array.isArray(tsList) ? tsList : []);
    } catch (err) {
      console.error("Master data fetch error:", err);
      addToast("Failed to load some dropdown data", "error");
    }
  };

  const checkAvailability = async () => {
    setIsChecking(true);
    try {
      const res = await checkVenueAvailability(formData.venue, formData.event_date, formData.time_slot);
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
    if (!formData.customer || !formData.venue || !formData.event_type || !formData.event_date || !formData.time_slot) {
      addToast("Please fill all required fields", "warning");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createVenueReservation(formData);
      addToast("Reservation created successfully!", "success");
      onReservationCreated();
      onClose();
    } catch (error) {
      addToast(error.toString(), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-slate-800">New Reservation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Customer *</label>
            <select name="customer" value={formData.customer} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.name} value={c.name}>{c.customer_name || c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Venue *</label>
            <select name="venue" value={formData.venue} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="">Select Venue</option>
              {venues.map(v => (
                <option key={v.name} value={v.name}>{v.item_name || v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Event Date *</label>
              <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Time Slot *</label>
              <select name="time_slot" value={formData.time_slot} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="">Select Time Slot</option>
                {timeSlots.map(ts => (
                  <option key={ts.name} value={ts.name}>{ts.name}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.venue && formData.event_date && formData.time_slot && (
            <div className={`p-3 rounded-xl text-sm font-medium ${isChecking ? 'bg-slate-100 text-slate-600' : isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {isChecking ? "Checking availability..." : isAvailable ? "✅ Venue is available for the selected slot." : "❌ Venue is already booked for this slot."}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Event Type *</label>
              <select name="event_type" value={formData.event_type} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="">Select Event Type</option>
                {eventTypes.map(et => (
                  <option key={et.name} value={et.name}>{et.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Guest Count</label>
              <input type="number" name="guest_count" value={formData.guest_count} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Special Instructions</label>
            <textarea name="special_instructions" value={formData.special_instructions} onChange={handleChange} rows="3" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none"></textarea>
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
              {isSubmitting ? "Submitting..." : "Reserve Venue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
