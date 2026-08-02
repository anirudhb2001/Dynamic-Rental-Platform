import React, { useState, useEffect } from "react";
import { searchCustomers, checkCustomerPermissions, getHotelProperties, getSeatingTypes, getVenues, getEventTypes, getTimeSlots, checkVenueAvailability, createVenueReservation } from "../../services/api";
import CreateCustomerModal from "./CreateCustomerModal";
import CustomerCombobox from "./CustomerCombobox";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const ReservationModal = ({ isOpen, onClose, initialDate, addToast, onReservationCreated, initialHotel, initialVenue, selectedHotelProperty, canViewAllProperties }) => {
  const [hotelProperties, setHotelProperties] = useState([]);
  const [seatingTypes, setSeatingTypes] = useState([]);
  const [venues, setVenues] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [formData, setFormData] = useState({
    customer: "",
    hotel_property: initialHotel || "",
    venue: initialVenue || "",
    event_type: "",
    event_date: initialDate || "",
    time_slot: "",
    seating_type: "",
    guest_count: 0,
    agreed_amount: "",
    special_instructions: "",
  });

  const [isAvailable, setIsAvailable] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [canCreateCustomer, setCanCreateCustomer] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
      
      let defaultProperty = initialHotel || selectedHotelProperty || "";
      
      setFormData(prev => ({ 
        ...prev, 
        event_date: initialDate || prev.event_date,
        hotel_property: defaultProperty,
        venue: initialVenue || prev.venue
      }));
    }
  }, [isOpen, initialDate, initialHotel, initialVenue, selectedHotelProperty]);

  useEffect(() => {
    if (formData.venue && formData.event_date && formData.time_slot) {
      checkAvailability();
    } else {
      setIsAvailable(null);
    }
  }, [formData.venue, formData.event_date, formData.time_slot]);
  
  useEffect(() => {
    const checkPerms = async () => {
      const hasPerm = await checkCustomerPermissions();
      setCanCreateCustomer(hasPerm);
    };
    checkPerms();
  }, []);

  const fetchMasterData = async () => {
    try {
      const hotelList = await getHotelProperties();
      setHotelProperties(Array.isArray(hotelList) ? hotelList : []);

      const stList = await getSeatingTypes();
      setSeatingTypes(Array.isArray(stList) ? stList : []);

      const fetchProp = !canViewAllProperties ? selectedHotelProperty : (formData.hotel_property || null);
      const venueList = await getVenues(fetchProp);
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
    const { name, value } = e.target;
    if (name === "venue") {
      const selectedVenue = venues.find(v => v.name === value);
      setFormData({ 
        ...formData, 
        venue: value, 
        agreed_amount: selectedVenue?.default_venue_rate || "" 
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleHotelChange = async (e) => {
    const newProp = e.target.value;
    setFormData({ ...formData, hotel_property: newProp, venue: "", agreed_amount: "" });
    if (canViewAllProperties || newProp) {
       const venueList = await getVenues(newProp);
       setVenues(Array.isArray(venueList) ? venueList : []);
    }
  };

  const getCapacityWarning = () => {
    if (!formData.venue || !formData.seating_type || !formData.guest_count) return null;
    const selectedVenue = venues.find(v => v.name === formData.venue);
    if (!selectedVenue || !selectedVenue.seating_capacities) return null;
    
    const capacityRow = selectedVenue.seating_capacities.find(sc => sc.seating_type === formData.seating_type);
    if (capacityRow && parseInt(formData.guest_count) > parseInt(capacityRow.capacity)) {
      return `Guest count ${formData.guest_count} exceeds the ${formData.seating_type} capacity of ${capacityRow.capacity} for ${selectedVenue.item_name || formData.venue}.`;
    }
    return null;
  };
  
  const capacityWarning = getCapacityWarning();

  const handleSubmit = async () => {
    if (!formData.customer || !formData.hotel_property || !formData.venue || !formData.event_type || !formData.event_date || !formData.time_slot || !formData.seating_type || !formData.agreed_amount) {
      addToast("Please fill all required fields", "warning");
      return;
    }
    
    // Check if customer exists
    let customerExists = false;
    try {
      const results = await searchCustomers(formData.customer);
      if (results && results.length > 0) {
         customerExists = results.some(c => c.name === formData.customer || c.customer_name === formData.customer);
      }
    } catch (e) {
      console.error(e);
    }
    
    if (!customerExists && canCreateCustomer) {
      addToast(`Customer "${formData.customer}" not found. Please create it first.`, "info");
      setPendingReservation(true);
      setIsCreateCustomerModalOpen(true);
      return;
    }

    await submitReservation(formData);
  };

  const submitReservation = async (dataToSubmit) => {
    setIsSubmitting(true);
    try {
      await createVenueReservation(dataToSubmit);
      addToast("Reservation created successfully!", "success");
      onReservationCreated();
      onClose();
    } catch (error) {
      addToast(error.toString(), "error");
    } finally {
      setIsSubmitting(false);
      setPendingReservation(false);
    }
  };

  const handleCustomerCreated = (newCustomer) => {
    const updatedForm = { ...formData, customer: newCustomer.name };
    setFormData(updatedForm);
    setIsCreateCustomerModalOpen(false);
    
    if (pendingReservation) {
      submitReservation(updatedForm);
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
        
        {formData.venue && (
          <div className="mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Standard Rate</div>
              <div className="text-lg font-bold text-slate-800">
                {venues.find(v => v.name === formData.venue)?.default_venue_rate ? `₹ ${venues.find(v => v.name === formData.venue).default_venue_rate.toLocaleString()} / day` : 'Rate on request'}
              </div>
            </div>
            <div className="text-right">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agreed Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-medium">₹</span>
                <input 
                  type="number" 
                  name="agreed_amount" 
                  value={formData.agreed_amount} 
                  onChange={handleChange} 
                  className="w-32 pl-7 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700 text-right"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-slate-700">Customer *</label>
              {canCreateCustomer && (
                <button 
                  type="button" 
                  onClick={() => setIsCreateCustomerModalOpen(true)}
                  className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  New Customer
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <CustomerCombobox
                value={formData.customer}
                onChange={(customerId) => handleChange({ target: { name: 'customer', value: customerId } })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Hotel Property</label>
              <select
                name="hotel_property"
                value={formData.hotel_property}
                onChange={handleHotelChange}
                className={`w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-slate-50 ${!canViewAllProperties ? "opacity-70 cursor-not-allowed" : ""}`}
                required
                disabled={!canViewAllProperties}
              >
                <option value="">Select Property</option>
                {hotelProperties.map(p => (
                  <option key={p.name} value={p.name}>{p.hotel_name || p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Venue *</label>
              <select name="venue" value={formData.venue} onChange={handleChange} disabled={!formData.hotel_property} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50">
                <option value="">Select Venue</option>
                {venues.filter(v => v.hotel_property === formData.hotel_property).map(v => (
                  <option key={v.name} value={v.name}>{v.item_name || v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Event Date *</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="DD/MM/YYYY"
                  value={formData.event_date ? dayjs(formData.event_date) : null}
                  onChange={(newValue) => {
                    handleChange({
                      target: {
                        name: "event_date",
                        value: newValue ? newValue.format("YYYY-MM-DD") : ""
                      }
                    });
                  }}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      size: "small",
                      sx: { 
                        '& .MuiInputBase-root': { borderRadius: '0.75rem', backgroundColor: '#f8fafc', height: '44px' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' }
                      }
                    } 
                  }}
                />
              </LocalizationProvider>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">Seating Type *</label>
              <select name="seating_type" value={formData.seating_type} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="">Select Seating Type</option>
                {seatingTypes.map(st => (
                  <option key={st.name} value={st.name}>{st.type_name || st.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Guest Count</label>
              <input type="number" name="guest_count" value={formData.guest_count} onChange={handleChange} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
              {capacityWarning && (
                <p className="text-red-500 text-xs mt-1 font-medium">{capacityWarning}</p>
              )}
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
              disabled={!isAvailable || isChecking || isSubmitting || capacityWarning}
              className={`px-5 py-2.5 rounded-xl font-semibold text-white transition-colors ${
                (!isAvailable || isChecking || isSubmitting || capacityWarning) ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 shadow-md'
              }`}
            >
              {isSubmitting ? "Submitting..." : "Reserve Venue"}
            </button>
          </div>
        </div>
      </div>
      
      <CreateCustomerModal 
        isOpen={isCreateCustomerModalOpen} 
        onClose={() => setIsCreateCustomerModalOpen(false)} 
        addToast={addToast} 
        onCustomerCreated={handleCustomerCreated}
        initialName={formData.customer}
      />
    </div>
  );
};

export default ReservationModal;
