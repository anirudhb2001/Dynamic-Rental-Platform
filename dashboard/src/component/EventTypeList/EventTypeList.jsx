import React, { useState, useEffect } from "react";
import { getEventTypes } from "../../services/api";

const EventTypeList = () => {
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await getEventTypes();
        setEventTypes(data || []);
      } catch (error) {
        console.error("Error fetching event types:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800">Event Types</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center opacity-60">
          <svg className="w-16 h-16 mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-lg font-medium text-slate-600">No event types found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {eventTypes.map((eventType) => (
            <div 
              key={eventType.name}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700">{eventType.name}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventTypeList;
