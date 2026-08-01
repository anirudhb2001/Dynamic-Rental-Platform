import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import { VITE_AUTHENTICATION } from "../../../../constants.js";

const localizer = momentLocalizer(moment);

const AvailabilityCalendar = ({ addToast, allBookingData }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Transform booking data into calendar events
    if (allBookingData && Array.isArray(allBookingData)) {
      const calendarEvents = allBookingData.map((booking) => {
        // Assuming booking has event_date, from_time, to_time, or time_slot
        const startDate = moment(booking.event_date || booking.date).toDate();
        const endDate = moment(booking.event_date || booking.date)
          .add(1, "hours")
          .toDate(); // Placeholder logic for end time

        return {
          title: `${booking.venue || "Venue"} - ${booking.customer_data || "Customer"}`,
          start: startDate,
          end: endDate,
          resource: booking,
        };
      });
      setEvents(calendarEvents);
    }
  }, [allBookingData]);

  const handleSelectEvent = (event) => {
    // Show reservation details
    addToast(`Selected Reservation for ${event.title}`, "info");
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <h2 className="text-2xl font-black mb-4">Availability Calendar</h2>
      <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          onSelectEvent={handleSelectEvent}
          views={["month", "week", "day"]}
        />
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
