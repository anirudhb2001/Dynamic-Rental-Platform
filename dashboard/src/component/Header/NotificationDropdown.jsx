import { useState, useEffect, useRef, useCallback } from "react";
import { FaRegBell } from "react-icons/fa";
import axios from "axios";
import { VITE_PUBLIC_NOTIFICATION_URL } from "../../../../constants";

/**
 * NotificationDropdown — self-contained notification bell + dropdown.
 *
 * Props:
 *   portalMode  — "customer" | "admin" (controls click-through behavior)
 */
function NotificationDropdown({ portalMode, isAuthenticated }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ---- Data Fetching ----

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(
        `${VITE_PUBLIC_NOTIFICATION_URL}.get_notifications`,
        { withCredentials: true }
      );
      const data = res.data?.message || [];
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(
        `${VITE_PUBLIC_NOTIFICATION_URL}.get_unread_count`,
        { withCredentials: true }
      );
      const count = res.data?.message?.count ?? 0;
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [isAuthenticated]);

  // Initial fetch + 30-second polling
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount, isAuthenticated]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Actions ----

  const handleNotificationClick = async (notification) => {
    // Optimistic update: mark as read locally
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.name === notification.name ? { ...n, is_read: 1 } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Server-side mark as read
      try {
        await axios.post(
          `${VITE_PUBLIC_NOTIFICATION_URL}.mark_notification_read`,
          { notification_name: notification.name },
          { withCredentials: true }
        );
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    // Admin mode: navigate to reference document if available
    if (
      portalMode !== "customer" &&
      notification.reference_doctype &&
      notification.reference_name
    ) {
      const slug = notification.reference_doctype
        .toLowerCase()
        .replace(/\s+/g, "-");
      window.location.href = `/app/${slug}/${notification.reference_name}`;
    }
  };

  // ---- Relative Timestamp ----

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;
    return date.toLocaleDateString();
  };

  // ---- Priority Color ----

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical":
        return "#dc2626";
      case "High":
        return "#f59e0b";
      case "Medium":
        return "#3b82f6";
      case "Low":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  // ---- Notification Type Icon ----

  const getTypeIcon = (type) => {
    switch (type) {
      case "Customer Registration":
        return "👤";
      case "Booking":
        return "📦";
      case "Booking Confirmation":
        return "✅";
      case "System":
        return "⚙️";
      default:
        return "🔔";
    }
  };

  // ---- Render ----

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors text-sm font-medium relative"
        id="notification-bell"
      >
        <FaRegBell className="h-4 w-4" />
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center text-white text-xs font-bold rounded-full"
            style={{ backgroundColor: "var(--primary-color, #e53935)", fontSize: "10px" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-3 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden"
          style={{ width: "360px", maxHeight: "480px" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
            style={{ backgroundColor: "#f9fafb" }}
          >
            <span className="font-semibold text-gray-900 text-sm">
              🔔 Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: "var(--primary-color, #e53935)" }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.name}
                  onClick={() => handleNotificationClick(n)}
                  className="px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: n.is_read ? "#ffffff" : "#f0f7ff",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = n.is_read
                      ? "#f9fafb"
                      : "#e8f0fe")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = n.is_read
                      ? "#ffffff"
                      : "#f0f7ff")
                  }
                >
                  <div className="flex items-start gap-3">
                    {/* Unread Indicator */}
                    <div className="flex-shrink-0 mt-1.5">
                      {!n.is_read ? (
                        <span
                          className="block h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              "var(--primary-color, #e53935)",
                          }}
                        />
                      ) : (
                        <span className="block h-2.5 w-2.5" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0 text-lg mt-0.5">
                      {getTypeIcon(n.notification_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium text-sm text-gray-900 truncate"
                          style={{ maxWidth: "200px" }}
                        >
                          {n.title}
                        </span>
                        <span
                          className="flex-shrink-0 h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: getPriorityColor(n.priority),
                          }}
                        />
                      </div>
                      <p
                        className="text-xs text-gray-500 mt-0.5 truncate"
                        style={{ maxWidth: "260px" }}
                      >
                        {n.message}
                      </p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {getRelativeTime(n.creation)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
