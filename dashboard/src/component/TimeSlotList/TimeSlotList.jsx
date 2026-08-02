import React, { useState, useEffect } from "react";
import { getTimeSlots } from "../../services/api";
import { LuClock } from "react-icons/lu";

const TimeSlotList = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        setLoading(true);
        const data = await getTimeSlots();
        setTimeSlots(data || []);
      } catch (error) {
        console.error("Error fetching time slots:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeSlots();
  }, []);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-5 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800">Time Slots</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : timeSlots.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center opacity-60">
          <LuClock className="w-16 h-16 mb-4 text-slate-400" />
          <p className="text-lg font-medium text-slate-600">No Time Slots found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {timeSlots.map((slot) => (
            <div 
              key={slot.name}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <LuClock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">{slot.name}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeSlotList;
