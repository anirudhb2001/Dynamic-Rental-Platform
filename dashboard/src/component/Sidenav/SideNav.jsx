import React, { useState } from "react";
import {
  LuLayoutDashboard,
  LuBuilding,
  LuCalendarDays,
  LuTag,
  LuCalendarClock,
  LuPieChart,
  LuChevronLeft,
  LuChevronRight,
  LuArmchair,
  LuClock,
  LuShoppingCart,
  LuCreditCard
} from "react-icons/lu";

const SideNav = ({
  companyName,
  onTabChange,
  activeTab,
  setActiveTab,
  branding,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const accentColor = branding?.accent_color || "#0f172a";

  const navGroups = [
    {
      title: "DASHBOARD",
      items: [
        { id: "dashboard", label: "Dashboard", icon: <LuLayoutDashboard className="h-5 w-5" /> },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { id: "venues", label: "Properties & Venues", icon: <LuBuilding className="h-5 w-5" /> },
        { id: "reservations", label: "Reservations", icon: <LuCalendarDays className="h-5 w-5" /> },
        { id: "calendar", label: "Availability Calendar", icon: <LuCalendarClock className="h-5 w-5" /> },
      ],
    },
    {
      title: "MASTERS",
      items: [
        { id: "eventTypes", label: "Event Types", icon: <LuTag className="h-5 w-5" /> },
        { id: "seatingTypes", label: "Seating Types", icon: <LuArmchair className="h-5 w-5" /> },
        { id: "timeSlots", label: "Time Slots", icon: <LuClock className="h-5 w-5" /> },
      ],
    },
    {
      title: "FINANCE",
      items: [
        { id: "salesOrders", label: "Sales Orders", icon: <LuShoppingCart className="h-5 w-5" /> },
        { id: "invoices", label: "Invoices & Payments", icon: <LuCreditCard className="h-5 w-5" /> },
      ],
    },
    {
      title: "ANALYTICS",
      items: [
        { id: "reports", label: "Reports", icon: <LuPieChart className="h-5 w-5" /> },
      ],
    }
  ];

  return (
    <div className={`flex flex-col h-full bg-white transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
      {/* Header Area */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <LuBuilding className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Venue ERP
              </span>
              <span className="text-sm font-bold truncate text-slate-900">
                {companyName || "Hotel & Resort"}
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex h-10 w-10 shrink-0 mx-auto items-center justify-center rounded-xl bg-primary text-white">
            <LuBuilding className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {!isCollapsed ? (
              <h3 className="px-5 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </h3>
            ) : (
              <div className="flex justify-center mb-2">
                <div className="w-8 h-[1px] bg-slate-200"></div>
              </div>
            )}
            
            <nav className="flex flex-col gap-1 px-3">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    title={isCollapsed ? item.label : ""}
                    onClick={() => {
                      setActiveTab(item.id);
                      onTabChange(item.id);
                    }}
                    className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                      isCollapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3"
                    } ${
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <div className={`${isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"}`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Collapse Toggle */}
      <div className="p-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
        >
          {isCollapsed ? <LuChevronRight className="h-4 w-4" /> : <LuChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default SideNav;
