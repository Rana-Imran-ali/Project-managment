import { useState, useEffect } from "react";
import { activityAPI } from "../services/api";
import { useSocket } from "../context/SocketContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ACTION_META = {
  task_created:   { icon: "➕", color: "#818cf8", label: "created task" },
  task_updated:   { icon: "✏️", color: "#60a5fa", label: "updated task" },
  task_deleted:   { icon: "🗑️", color: "#f87171", label: "deleted task" },
  task_completed: { icon: "✅", color: "#34d399", label: "completed task" },
  task_assigned:  { icon: "🎯", color: "#f59e0b", label: "assigned task" },
  comment_added:  { icon: "💬", color: "#a78bfa", label: "commented on" },
  status_changed: { icon: "🔄", color: "#06b6d4", label: "changed status on" },
  default:        { icon: "📌", color: "#9ca3af", label: "performed action on" },
};

function Avatar({ name, size = 28 }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <div
      className="user-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, flexShrink: 0 }}
    >
      {initials}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ActivityFeed({ projectId }) {
  const socket = useSocket();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // ── Initial fetch ───────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    fetchActivities();
  }, [projectId]);

  // ── Socket: listen for new activity events on this project ──
  // Note: TaskBoard already joins the project room, so we can
  // listen on the same event without double-joining.
  useEffect(() => {
    if (!socket || !projectId) return;

    const onActivity = (activity) => {
      setActivities((prev) => {
        if (prev.some((a) => a._id === activity._id)) return prev;
        return [activity, ...prev]; // newest first
      });
    };

    socket.on("activity:new", onActivity);
    return () => socket.off("activity:new", onActivity);
  }, [socket, projectId]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await activityAPI.getByProject(projectId);
      setActivities(res.data.activities || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const visible = collapsed ? activities.slice(0, 5) : activities;

  return (
    <div className="activity-feed-section">
      <div className="activity-feed-header">
        <h2 className="task-board-title">
          <span>⚡</span> Activity
        </h2>
        {activities.length > 5 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? `Show all (${activities.length})` : "Show less"}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "32px" }}>
          <span className="spinner" style={{ width: "24px", height: "24px" }} />
        </div>
      ) : activities.length === 0 ? (
        <div className="activity-empty">
          <span style={{ fontSize: "32px" }}>📭</span>
          <p>No activity yet. Actions will show up here.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {visible.map((a, i) => {
            const meta = ACTION_META[a.action] || ACTION_META.default;
            const isLast = i === visible.length - 1;

            return (
              <div key={a._id} className="activity-item">
                {/* Vertical line */}
                <div className="activity-line-wrap">
                  <div
                    className="activity-icon"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    {meta.icon}
                  </div>
                  {!isLast && <div className="activity-connector" />}
                </div>

                <div className="activity-content">
                  <div className="activity-main">
                    <Avatar name={a.user?.name} size={24} />
                    <p className="activity-text">
                      <strong className="activity-actor">{a.user?.name || "Someone"}</strong>
                      {" "}{meta.label}{" "}
                      {a.task?.title && (
                        <span className="activity-subject">"{a.task.title}"</span>
                      )}
                      {a.description && !a.task?.title && (
                        <span className="activity-subject">{a.description}</span>
                      )}
                    </p>
                  </div>
                  <span className="activity-time">{timeAgo(a.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
