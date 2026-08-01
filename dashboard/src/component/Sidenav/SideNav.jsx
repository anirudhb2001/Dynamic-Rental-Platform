import React, { useEffect, useState } from "react";
import {
  LuLayoutDashboard,
  LuBuilding,
  LuCalendarDays,
  LuTag,
  LuCalendarClock,
  LuPieChart,
} from "react-icons/lu";

const SideNav = ({
  companyName,
  onTabChange,
  activeTab,
  setActiveTab,
  branding,
}) => {
  const accentColor = branding?.accent_color || "#0f172a";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LuLayoutDashboard className="h-5 w-5" /> },
    { id: "venues", label: "Venues", icon: <LuBuilding className="h-5 w-5" /> },
    { id: "reservations", label: "Reservations", icon: <LuCalendarDays className="h-5 w-5" /> },
    { id: "eventTypes", label: "Event Types", icon: <LuTag className="h-5 w-5" /> },
    { id: "calendar", label: "Calendar", icon: <LuCalendarClock className="h-5 w-5" /> },
    { id: "reports", label: "Reports", icon: <LuPieChart className="h-5 w-5" /> },
  ];

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-3 backdrop-blur-xl">
      <div className="flex flex-col gap-5">
        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            background: `linear-gradient(to bottom right, ${accentColor}, ${accentColor}dd, ${accentColor}aa)`,
          }}
        >
          <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-white/15 blur-3xl"></div>
          <div className="absolute bottom-0 left-8 h-16 w-32 rounded-t-full bg-white/10 blur-2xl"></div>
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
              <LuBuilding className="h-6 w-6" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
              Venue Reservation ERP
            </p>
            <h2 className="mt-1 text-xl font-black leading-tight">
              {companyName || "Hotel & Resort"}
            </h2>
          </div>
        </section>

        <nav className="flex flex-col gap-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onTabChange(item.id);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === item.id
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-600 hover:bg-white/60 hover:text-primary"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default SideNav;
