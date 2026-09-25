import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { notificationAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_META = {
  task_assigned:   { icon: "🎯", color: "#818cf8" },
  task_updated:    { icon: "✏️", color: "#60a5fa" },
  task_completed:  { icon: "✅", color: "#34d399" },
  comment_added:   { icon: "💬", color: "#f59e0b" },
  project_updated: { icon: "📁", color: "#a78bfa" },
  project_added:   { icon: "🚀", color: "#ec4899" },
  default:         { icon: "🔔", color: "#9ca3af" },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const socket = useSocket();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time notification listener via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => {
        // Prevent duplicate if already in list
        const filtered = prev.filter((n) => n._id !== notif._id);
        return [notif, ...filtered];
      });
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket]);

  // Poll unread count every 30 s as a fallback
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    try {
      const res = await notificationAPI.getUnread();
      setUnreadCount(res.data.count || 0);
    } catch { /* silent */ }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleBellClick = () => {
    if (!open) fetchAll();
    setOpen((v) => !v);
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleItemClick = (n) => {
    if (!n.isRead) handleMarkOne(n._id);
    if (n.project?._id) {
      navigate(`/projects/${n.project._id}`);
      setOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        className="notif-bell-btn"
        onClick={handleBellClick}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }}>🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="notif-dropdown">
          {/* Header */}
          <div className="notif-header">
            <span className="notif-header-title">
              Notifications
              {unreadCount > 0 && (
                <span className="notif-unread-pill">{unreadCount} new</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all-btn"
                onClick={handleMarkAll}
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">
                <span className="spinner" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <span style={{ fontSize: "32px" }}>🔕</span>
                <p>All caught up!</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type?.replace(/-/g, "_")] || TYPE_META[n.type] || TYPE_META.default;
                return (
                  <div
                    key={n._id}
                    className={`notif-item ${n.isRead ? "" : "notif-item--unread"}`}
                    onClick={() => handleItemClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleItemClick(n)}
                  >
                    <div
                      className="notif-icon"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      {meta.icon}
                    </div>

                    <div className="notif-body">
                      <p className="notif-text">
                        {n.sender?.name && (
                          <strong>{n.sender.name} </strong>
                        )}
                        {n.message || n.type?.replace(/_/g, " ")}
                      </p>
                      {(n.task?.title || n.project?.name) && (
                        <p className="notif-meta">
                          {n.task?.title && `📋 ${n.task.title}`}
                          {n.task?.title && n.project?.name && " · "}
                          {n.project?.name && `📁 ${n.project.name}`}
                        </p>
                      )}
                      <p className="notif-time">{timeAgo(n.createdAt)}</p>
                    </div>

                    <div className="notif-actions">
                      {!n.isRead && (
                        <button
                          className="notif-action-btn"
                          onClick={(e) => { e.stopPropagation(); handleMarkOne(n._id); }}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="notif-action-btn notif-action-btn--del"
                        onClick={(e) => handleDelete(n._id, e)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
