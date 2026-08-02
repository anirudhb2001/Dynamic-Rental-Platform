import React, { useState, useEffect } from "react";
import moment from "moment";
import ReservationModal from "./ReservationModal";
import ReservationExtensionModal from "./ReservationExtensionModal";
import ReservationDetails from "./ReservationDetails";
import { getHotelProperties, getAllVenueReservations, getVenues } from "../../services/api";

const AvailabilityCalendar = ({ addToast, allBookingData, refreshBookings, selectedHotelProperty, canViewAllProperties }) => {
  const [hotelProperties, setHotelProperties] = useState([]);
  const [venues, setVenues] = useState([]);
  const [calendarBookings, setCalendarBookings] = useState([]);
  
  // Bedboard View State
  const [startDate, setStartDate] = useState(moment().startOf("day"));
  const [daysToShow, setDaysToShow] = useState(7);
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Selected Data for Modals
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const hList = await getHotelProperties();
        setHotelProperties(hList || []);
      } catch (err) {
        console.error("Failed to load hotels for filter", err);
      }
    };
    fetchHotels();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const [bookingsData, venuesData] = await Promise.all([
        getAllVenueReservations(selectedHotelProperty),
        getVenues(selectedHotelProperty || null)
      ]);
      setCalendarBookings(bookingsData || []);
      setVenues(venuesData || []);
    } catch (err) {
      console.error("Failed to load calendar data", err);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [selectedHotelProperty]); // Refetch when global hotel filter changes

  // Filter bookings by hotel (in memory just to be safe)
  const filteredBookings = selectedHotelProperty && selectedHotelProperty !== "All Properties"
    ? calendarBookings.filter(b => b.hotel_property === selectedHotelProperty)
    : calendarBookings;

  // Generate Date Columns
  const dates = Array.from({ length: daysToShow }).map((_, i) => moment(startDate).add(i, "days"));

  // Helper to find bookings for a specific cell
  const getBookingsForCell = (venueName, dateStr) => {
    const matched = [];
    filteredBookings.forEach(booking => {
      if (booking.venue !== venueName) return;
      
      const bDate = moment(booking.event_date || booking.date).format("YYYY-MM-DD");
      if (bDate === dateStr) {
        matched.push({ ...booking, isExtension: false });
      }
      
      // Extensions
      if (booking.reservation_extensions && Array.isArray(booking.reservation_extensions)) {
        booking.reservation_extensions.forEach(ext => {
          if (ext.status !== 'Cancelled' && moment(ext.extension_date).format("YYYY-MM-DD") === dateStr) {
            matched.push({ ...booking, ...ext, isExtension: true, originalBooking: booking });
          }
        });
      }
    });
    return matched;
  };

  const handleNextDate = () => setStartDate(moment(startDate).add(daysToShow, "days"));
  const handlePrevDate = () => setStartDate(moment(startDate).subtract(daysToShow, "days"));
  const handleToday = () => setStartDate(moment().startOf("day"));

  const openNewReservation = (dateStr = null, venueName = "") => {
    setSelectedDate(dateStr);
    setSelectedVenue(venueName);
    setIsNewModalOpen(true);
  };

  const openDetails = (booking) => {
    setSelectedBooking(booking.isExtension ? booking.originalBooking : booking);
    setIsDetailsModalOpen(true);
  };

  const handleExtendClick = (bookingDetails) => {
    setSelectedBooking(bookingDetails);
    setIsExtModalOpen(true);
  };

  // Status styling
  const getStatusColor = (status) => {
    switch (status) {
      case "Reserved": return "bg-emerald-500 text-white border-emerald-600";
      case "Completed": return "bg-indigo-500 text-white border-indigo-600";
      case "Cancelled": return "bg-rose-500 text-white border-rose-600";
      default: return "bg-blue-500 text-white border-blue-600";
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Bedboard Timeline</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {startDate.format("MMMM YYYY")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button onClick={handlePrevDate} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={handleToday} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Today
            </button>
            <button onClick={handleNextDate} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button 
              onClick={() => setDaysToShow(7)} 
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${daysToShow === 7 ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setDaysToShow(14)} 
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${daysToShow === 14 ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              14 Days
            </button>
          </div>
          
          <button 
            onClick={() => openNewReservation(null, "")}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Reservation
          </button>
        </div>
      </div>

      {/* Bedboard Matrix */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Header Row (Dates) */}
        <div className="flex border-b border-slate-200 bg-slate-50/80">
          <div className="w-48 shrink-0 border-r border-slate-200 p-4 flex items-center justify-center font-bold text-slate-500 uppercase text-xs tracking-wider">
            Venues
          </div>
          <div className="flex-1 flex min-w-max">
            {dates.map((d, i) => (
              <div key={i} className="flex-1 min-w-[120px] p-3 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center text-center">
                <span className={`text-xs font-bold uppercase ${d.isSame(moment(), 'day') ? 'text-primary' : 'text-slate-500'}`}>
                  {d.format('ddd')}
                </span>
                <span className={`text-xl font-black mt-0.5 ${d.isSame(moment(), 'day') ? 'text-primary' : 'text-slate-800'}`}>
                  {d.format('DD')}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {d.format('MMM')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Matrix Body (Venues & Cells) */}
        <div className="flex-1 overflow-auto flex flex-col relative">
          {venues.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
              No venues found for the selected property.
            </div>
          ) : (
            venues.map((venue) => (
              <div key={venue.name} className="flex min-h-[100px] border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                {/* Venue Label */}
                <div className="w-48 shrink-0 border-r border-slate-200 p-4 flex flex-col justify-center bg-white group-hover:bg-transparent transition-colors z-10 sticky left-0 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
                  <h3 className="font-bold text-slate-800 text-sm">{venue.venue_name || venue.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 truncate">{venue.hotel_property}</p>
                </div>

                {/* Cells */}
                <div className="flex-1 flex min-w-max">
                  {dates.map((d, i) => {
                    const dateStr = d.format("YYYY-MM-DD");
                    const cellBookings = getBookingsForCell(venue.name, dateStr);
                    
                    return (
                      <div 
                        key={i} 
                        onClick={(e) => {
                          // Only trigger empty cell click if we didn't click a booking block
                          if (e.target === e.currentTarget) {
                            openNewReservation(dateStr, venue.name);
                          }
                        }}
                        className="flex-1 min-w-[120px] border-r border-slate-100 last:border-r-0 p-1.5 flex flex-col gap-1.5 cursor-pointer hover:bg-slate-100/50 transition-colors relative"
                        title="Click to add reservation"
                      >
                        {cellBookings.map((bk, bIdx) => (
                          <div
                            key={bIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(bk);
                            }}
                            className={`px-2 py-1.5 rounded-lg border shadow-sm cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all ${getStatusColor(bk.status)}`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-0.5">
                              {bk.time_slot} {bk.isExtension && "(Ext)"}
                            </div>
                            <div className="text-xs font-bold truncate">
                              {bk.customer_name || bk.customer_data || bk.customer}
                            </div>
                            <div className="text-[10px] opacity-80 truncate mt-0.5">
                              {bk.event_type}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ReservationModal 
        isOpen={isNewModalOpen} 
        onClose={() => { setIsNewModalOpen(false); setSelectedVenue(""); }} 
        initialDate={selectedDate}
        initialVenue={selectedVenue}
        addToast={addToast}
        onReservationCreated={() => {
          fetchCalendarData();
          if (refreshBookings) refreshBookings();
        }}
        selectedHotelProperty={selectedHotelProperty}
        canViewAllProperties={canViewAllProperties}
      />

      <ReservationExtensionModal
        isOpen={isExtModalOpen}
        onClose={() => setIsExtModalOpen(false)}
        originalBooking={selectedBooking}
        addToast={addToast}
        onExtensionCreated={() => {
          fetchCalendarData();
          if (refreshBookings) refreshBookings();
        }}
      />

      <ReservationDetails
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bookingName={selectedBooking ? (selectedBooking.name || selectedBooking.originalBooking?.name) : null}
        addToast={addToast}
        onExtendClick={handleExtendClick}
        onInvoiceCreated={() => {
          fetchCalendarData();
          if (refreshBookings) refreshBookings();
        }}
      />
    </div>
  );
};

export default AvailabilityCalendar;
