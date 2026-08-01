import React, { useState, useEffect } from "react";
import { LuCalendar, LuDollarSign, LuCheckSquare, LuBuilding, LuPercent, LuClock, LuChevronDown, LuPlus } from "react-icons/lu";
import { getOperationalDashboardSummary, getHotelProperties } from "../../services/api";
import dayjs from "dayjs";

const OperationalDashboard = ({ selectedHotelProperty, setSelectedHotelProperty, onNavigate, onNewReservationClick }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const props = await getHotelProperties();
        setProperties(props || []);
      } catch (error) {
        console.error("Failed to fetch hotel properties", error);
      }
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await getOperationalDashboardSummary(selectedHotelProperty);
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch operational dashboard summary", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [selectedHotelProperty]);

  const kpis = dashboardData?.kpis || {
    total_venues: 0,
    available_venues: 0,
    upcoming_events: 0,
    today_events: 0,
    outstanding_amount: 0,
    total_bookable_time_slots: 0,
    booked_time_slots: 0
  };

  const todayEvents = dashboardData?.today_events || [];
  const upcomingReservations = dashboardData?.upcoming_reservations || [];
  const venuesOverview = dashboardData?.venue_availability || [];
  const paymentSummary = dashboardData?.payment_summary || { total_booking_value: 0, advance_received: 0, outstanding_amount: 0 };

  const venueUtilizationPct = kpis.total_bookable_time_slots > 0 
    ? Math.round((kpis.booked_time_slots / kpis.total_bookable_time_slots) * 100) 
    : 0;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-6 backdrop-blur-xl">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Operational Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">Overview of your hotel venues and reservations</p>
        </div>
        
        {/* Property Filter */}
        <div className="relative">
          <select 
            value={selectedHotelProperty}
            onChange={(e) => setSelectedHotelProperty(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="All Properties">All Properties</option>
            {properties.map(p => (
              <option key={p.name} value={p.name}>{p.property_name || p.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <LuChevronDown className="w-5 h-5" />
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500">Venue Utilization</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-3xl font-black text-slate-900">{venueUtilizationPct}</h3>
              <span className="text-lg font-bold text-slate-400">%</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <LuPercent size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500">Upcoming Reservations</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{kpis.upcoming_events || 0}</h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <LuCheckSquare size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500">Today's Events</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{kpis.today_events || 0}</h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <LuCalendar size={24} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500">Pending Payments</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 truncate max-w-[140px]" title={`₹${kpis.outstanding_amount || 0}`}>
              ₹{(kpis.outstanding_amount || 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <LuClock size={24} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Main Content Area (Events & Reservations) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Today's Events */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex-1">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-800">
              <span className="w-2 h-6 bg-orange-400 rounded-full inline-block"></span>
              Today's Events
            </h3>
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : todayEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {todayEvents.map((event, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100/50 cursor-pointer"
                    onClick={() => onNavigate && onNavigate("reservations")}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{event.venue}</span>
                      <span className="text-sm text-slate-500 font-medium">
                        {event.customer} • {event.time_slot || "Full Day"} • {event.guest_count || 0} Guests
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-bold text-primary">{event.event_type || 'Event'}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg mt-1 ${event.booking_status === "Confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                        {event.booking_status || "Today"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <LuCalendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium mb-4">No events scheduled for today</p>
                <button 
                  onClick={onNewReservationClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  <LuPlus className="w-4 h-4" /> Create Reservation
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Reservations */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                <span className="w-2 h-6 bg-emerald-400 rounded-full inline-block"></span>
                Upcoming Reservations
              </h3>
              <button 
                onClick={() => onNavigate && onNavigate("reservations")}
                className="text-primary hover:text-primary/80 font-bold text-sm"
              >
                View All Reservations
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : upcomingReservations.length > 0 ? (
              <div className="flex flex-col gap-3">
                {upcomingReservations.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100/50">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{res.venue}</span>
                      <span className="text-sm text-slate-500 font-medium">{res.customer} • {res.event_type || 'Event'}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-bold text-slate-700">{dayjs(res.date).format("MMM DD, YYYY")}</span>
                      <span className="text-xs font-bold text-emerald-600 mt-1">{res.time_slot || "Full Day"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <LuCheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No upcoming reservations</p>
              </div>
            )}
          </div>
          
        </div>

        {/* Right Sidebar Area (Venue Overview & Payments) */}
        <div className="flex flex-col gap-6 h-full">
          {/* Venue Status */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                <span className="w-2 h-6 bg-indigo-400 rounded-full inline-block"></span>
                Venue Availability
              </h3>
              <button 
                onClick={() => onNavigate && onNavigate("calendar")}
                className="text-primary hover:text-primary/80 font-bold text-sm"
              >
                View Calendar
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : venuesOverview.length > 0 ? (
              <div className="flex flex-col gap-3">
                {venuesOverview.map((venue, idx) => {
                  const isBooked = venue.status === "BOOKED";
                  const isAvailable = venue.status === "AVAILABLE";
                  
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100/50">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isBooked ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{venue.venue}</p>
                      </div>
                      <div className="shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isBooked ? 'bg-orange-100 text-orange-700' : isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          {venue.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <LuBuilding className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No venues found</p>
              </div>
            )}
          </div>
          
          {/* Payment Overview */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-slate-800">
              <span className="w-2 h-6 bg-blue-400 rounded-full inline-block"></span>
              Payment Overview
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-500"><LuDollarSign className="w-5 h-5"/></div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">Total Booking Value</p>
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-slate-900">₹{(paymentSummary.total_booking_value || 0).toLocaleString('en-IN')}</h4>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><LuDollarSign className="w-5 h-5"/></div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700/80">Advance Received</p>
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-emerald-700">₹{(paymentSummary.advance_received || 0).toLocaleString('en-IN')}</h4>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><LuClock className="w-5 h-5"/></div>
                    <div>
                      <p className="text-sm font-bold text-orange-700/80">Outstanding Amount</p>
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-orange-700">₹{(paymentSummary.outstanding_amount || 0).toLocaleString('en-IN')}</h4>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalDashboard;
