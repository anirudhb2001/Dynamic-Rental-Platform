import React, { useState, useEffect } from "react";
import { getHotelProperties, getVenues } from "../../services/api";
import { LuMapPin, LuUsers, LuMaximize, LuCalendar } from "react-icons/lu";
import ReservationModal from "../AvailabilityCalendar/ReservationModal";

const VenueList = ({ addToast, fetchData }) => {
  const [hotels, setHotels] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reservation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHotel, setModalHotel] = useState("");
  const [modalVenue, setModalVenue] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [hotelData, venueData] = await Promise.all([
        getHotelProperties(),
        getVenues()
      ]);
      setHotels(hotelData || []);
      setVenues(venueData || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to load venues", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserveClick = (hotelName, venueName) => {
    setModalHotel(hotelName);
    setModalVenue(venueName);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading properties...</div>;
  }

  // Browse Hotels View
  if (!selectedHotel) {
    return (
      <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
        <h2 className="text-2xl font-black mb-6 text-slate-800">Our Properties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <div 
              key={hotel.name} 
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md cursor-pointer transition-shadow"
              onClick={() => setSelectedHotel(hotel.name)}
            >
              <div className="h-48 bg-slate-200 relative">
                {hotel.property_image ? (
                  <img src={hotel.property_image} alt={hotel.hotel_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-400">No Image</div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{hotel.hotel_name || hotel.name}</h3>
                <div className="flex items-center text-slate-500 text-sm mb-2">
                  <LuMapPin className="mr-2" />
                  {hotel.city}, {hotel.state}
                </div>
                <button className="mt-4 w-full py-2 bg-primary/10 text-primary font-semibold rounded-xl hover:bg-primary/20 transition-colors">
                  View Venues
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Browse Venues inside selected Hotel
  const filteredVenues = venues.filter(v => v.hotel_property === selectedHotel);
  const hotelObj = hotels.find(h => h.name === selectedHotel) || {};

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => setSelectedHotel(null)} className="text-sm font-semibold text-primary hover:underline mb-1">
            &larr; Back to Properties
          </button>
          <h2 className="text-2xl font-black text-slate-800">{hotelObj.hotel_name || selectedHotel} Venues</h2>
        </div>
      </div>

      {filteredVenues.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl">No venues found for this property.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVenues.map((venue) => (
            <div key={venue.name} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="h-56 bg-slate-200 relative">
                {venue.venue_image ? (
                  <img src={venue.venue_image} alt={venue.item_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-400">No Image</div>
                )}
                {venue.venue_status && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur text-xs font-bold rounded-full shadow-sm text-slate-700">
                    {venue.venue_status}
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{venue.item_name || venue.name}</h3>
                    <div className="flex items-center text-slate-500 text-sm">
                      <LuMapPin className="mr-1.5" />
                      {venue.hotel_property}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end font-semibold text-slate-700">
                      <LuMaximize className="mr-1.5 text-slate-400" />
                      {venue.venue_size} {venue.venue_size_unit}
                    </div>
                  </div>
                </div>

                <div className="mb-5 flex-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Seating Capacities</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    {venue.seating_capacities && venue.seating_capacities.length > 0 ? (
                      venue.seating_capacities.map((sc, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-1">
                          <span className="text-slate-600">{sc.seating_type}</span>
                          <span className="font-semibold text-slate-800 flex items-center">
                            {sc.capacity} <LuUsers className="ml-1 w-3 h-3 text-slate-400" />
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400 col-span-2">No seating capacities defined.</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => handleReserveClick(venue.hotel_property, venue.name)}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <LuCalendar className="w-5 h-5" />
                  Reserve Venue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reused Reservation Modal */}
      <ReservationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        addToast={addToast}
        onReservationCreated={() => {
          fetchData && fetchData();
          setIsModalOpen(false);
        }}
        initialHotel={modalHotel}
        initialVenue={modalVenue}
      />
    </div>
  );
};

export default VenueList;