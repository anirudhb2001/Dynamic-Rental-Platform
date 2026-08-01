import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import ReservationModal from "./ReservationModal";
import ReservationExtensionModal from "./ReservationExtensionModal";
import ReservationDetails from "./ReservationDetails";
import { getHotelProperties, getAllVenueReservations } from "../../services/api";

const localizer = momentLocalizer(moment);

const AvailabilityCalendar = ({ addToast, allBookingData, refreshBookings }) => {
  const [hotelProperties, setHotelProperties] = useState([]);
  const [filterHotel, setFilterHotel] = useState("");
  const [events, setEvents] = useState([]);
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(null);
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

  const [calendarBookings, setCalendarBookings] = useState([]);

  const fetchCalendarBookings = async () => {
    try {
      const data = await getAllVenueReservations();
      setCalendarBookings(data || []);
    } catch (err) {
      console.error("Failed to load venue reservations for calendar", err);
    }
  };

  useEffect(() => {
    fetchCalendarBookings();
  }, []);

  useEffect(() => {
    if (calendarBookings && Array.isArray(calendarBookings)) {
      const calendarEvents = [];
      
      const filteredData = filterHotel 
        ? calendarBookings.filter(b => b.hotel_property === filterHotel)
        : calendarBookings;
        
      filteredData.forEach((booking) => {
        // Original Reservation Event
        const startDate = moment(booking.event_date || booking.date).toDate();
        const endDate = moment(startDate).add(1, "hours").toDate();
        
        calendarEvents.push({
          title: `${booking.venue || "Venue"} | ${booking.event_type || "Event"} | ${booking.customer_name || booking.customer_data || booking.customer} | ${booking.time_slot}`,
          start: startDate,
          end: endDate,
          resource: booking,
        });
        
        // If the booking object happens to include extensions (e.g. joined data)
        if (booking.reservation_extensions && Array.isArray(booking.reservation_extensions)) {
          booking.reservation_extensions.forEach(ext => {
            if (ext.status !== 'Cancelled') {
              const extStart = moment(ext.extension_date).toDate();
              const extEnd = moment(extStart).add(1, "hours").toDate();
              calendarEvents.push({
                title: `${booking.venue} | Extension | ${booking.customer_name || booking.customer} | ${ext.time_slot}`,
                start: extStart,
                end: extEnd,
                resource: booking, // pass original booking for reference
              });
            }
          });
        }
      });
      setEvents(calendarEvents);
    }
  }, [calendarBookings, filterHotel]);

  const handleSelectEvent = (event) => {
    setSelectedBooking(event.resource);
    setIsDetailsModalOpen(true);
  };

  const handleSelectSlot = (slotInfo) => {
    const formattedDate = moment(slotInfo.start).format('YYYY-MM-DD');
    setSelectedDate(formattedDate);
    setIsNewModalOpen(true);
  };

  const handleExtendClick = (bookingDetails) => {
    setSelectedBooking(bookingDetails);
    setIsExtModalOpen(true);
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-slate-800">Availability Calendar</h2>
        <div className="flex items-center gap-4">
          <select 
            value={filterHotel} 
            onChange={(e) => setFilterHotel(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 outline-none min-w-[200px]"
          >
            <option value="">All Properties</option>
            {hotelProperties.map(h => (
              <option key={h.name} value={h.name}>{h.hotel_name || h.name}</option>
            ))}
          </select>
          <button 
            onClick={() => { setSelectedDate(null); setIsNewModalOpen(true); }}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Reservation
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          onSelectEvent={handleSelectEvent}
          selectable={true}
          onSelectSlot={handleSelectSlot}
          views={["month", "week", "day"]}
          popup={true}
          eventPropGetter={(event) => {
            let backgroundColor = "#3b82f6"; // default blue
            if (event.resource?.status === "Reserved") backgroundColor = "#10b981"; // green
            if (event.resource?.status === "Cancelled") backgroundColor = "#ef4444"; // red
            if (event.resource?.status === "Completed") backgroundColor = "#6366f1"; // indigo
            
            return {
              style: {
                backgroundColor,
                borderRadius: "6px",
                opacity: 0.9,
                color: "white",
                border: "none",
                display: "block",
                padding: "2px 5px",
                fontWeight: "500",
                fontSize: "12px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }
            };
          }}
        />
      </div>

      <ReservationModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        initialDate={selectedDate}
        addToast={addToast}
        onReservationCreated={() => {
          fetchCalendarBookings();
          if (refreshBookings) refreshBookings();
        }}
      />

      <ReservationExtensionModal
        isOpen={isExtModalOpen}
        onClose={() => setIsExtModalOpen(false)}
        originalBooking={selectedBooking}
        addToast={addToast}
        onExtensionCreated={() => {
          fetchCalendarBookings();
          if (refreshBookings) refreshBookings();
        }}
      />

      <ReservationDetails
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bookingName={selectedBooking ? selectedBooking.name : null}
        addToast={addToast}
        onExtendClick={handleExtendClick}
        onInvoiceCreated={() => {
          fetchCalendarBookings();
          if (refreshBookings) refreshBookings();
        }}
      />
    </div>
  );
};

export default AvailabilityCalendar;
