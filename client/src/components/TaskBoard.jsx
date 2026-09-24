import { useState, useEffect } from "react";
import { taskAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CommentThread from "./CommentThread";
import TaskAttachments from "./TaskAttachments";

// ─── Constants ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: "todo",        label: "To Do",       color: "#9ca3af", bg: "rgba(156,163,175,0.08)" },
  { key: "in-progress", label: "In Progress", color: "#60a5fa", bg: "rgba(59,130,246,0.08)"  },
  { key: "completed",   label: "Completed",   color: "#34d399", bg: "rgba(16,185,129,0.08)"  },
];

const PRIORITY_META = {
  low:    { label: "Low",    color: "#34d399", bg: "rgba(16,185,129,0.12)"  },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  high:   { label: "High",   color: "#f87171", bg: "rgba(239,68,68,0.12)"   },
};

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return "No due date";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onStatusChange, onDelete, onClick, isAdmin, currentUser }) {
  const pri = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const overdue = isOverdue(task.dueDate);
  const isAssignee =
    task.assignedTo?._id === currentUser?._id ||
    task.assignedTo === currentUser?._id;
  const canChangeStatus = isAdmin || isAssignee;

  return (
    <div className="task-card" onClick={() => onClick(task)}>
      {/* Priority stripe */}
      <div className="task-card-stripe" style={{ background: pri.color }} />

      <div className="task-card-body">
        <div className="task-card-top">
          <span
            className="task-priority-badge"
            style={{ color: pri.color, background: pri.bg }}
          >
            {pri.label}
          </span>
          {isAdmin && (
            <button
              className="task-delete-btn"
              onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
              title="Delete task"
            >
              ×
            </button>
          )}
        </div>

        <h4 className="task-title">{task.title}</h4>

        {task.description && (
          <p className="task-desc">{task.description}</p>
        )}

        <div className="task-card-footer">
          {task.dueDate && (
            <span
              className="task-due"
              style={{ color: overdue ? "#f87171" : "var(--text-muted)" }}
            >
              {overdue ? "⚠️" : "📅"} {formatDate(task.dueDate)}
            </span>
          )}

          {task.assignedTo?.name && (
            <div className="task-assignee">
              <div className="task-assignee-avatar">
                {task.assignedTo.name[0].toUpperCase()}
              </div>
              <span>{task.assignedTo.name.split(" ")[0]}</span>
            </div>
          )}
        </div>

        {/* Inline status change */}
        <select
          className="task-status-select"
          value={task.status}
          disabled={!canChangeStatus}
          title={
            canChangeStatus
              ? "Change status"
              : "Only assigned employees or admins can update status"
          }
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
        >
          {COLUMNS.map((col) => (
            <option key={col.key} value={col.key}>{col.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── TaskModal (Create/Edit + Comments) ───────────────────────────────────────
function TaskModal({ mode, task, projectId, projectMembers = [], onClose, onSave }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEdit = mode === "edit";
  const isAssignee =
    isEdit &&
    (task?.assignedTo?._id === user?._id || task?.assignedTo === user?._id);
  const canEditStatus = isAdmin || isAssignee;

  const [form, setForm] = useState({
    title: isEdit ? task.title : "",
    description: isEdit ? task.description || "" : "",
    status: isEdit ? task.status : "todo",
    priority: isEdit ? task.priority : "medium",
    dueDate: isEdit && task.dueDate ? task.dueDate.slice(0, 10) : "",
    assignedTo: isEdit ? task.assignedTo?._id || "" : "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details"); // "details" | "comments"

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = isAdmin
        ? {
            ...form,
            project: projectId,
            assignedTo: form.assignedTo ? form.assignedTo : null,
            dueDate: form.dueDate ? form.dueDate : null,
          }
        : {
            status: form.status,
          };

      if (isEdit) {
        const res = await taskAPI.update(task._id, payload);
        onSave(res.data.task, "update");
      } else {
        const res = await taskAPI.create(payload);
        onSave(res.data.task, "create");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save task.");
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: "620px" }}>
        {/* Modal Header */}
        <div className="task-modal-header">
          <h2 style={{ fontSize: "18px", margin: 0 }}>
            {isEdit ? (isAdmin ? "✏️ Edit Task" : "📋 Task Details") : "➕ Create Task"}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tabs (only show comments & attachments tabs when editing) */}
        {isEdit && (
          <div className="task-modal-tabs">
            <button
              className={`task-modal-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
            <button
              className={`task-modal-tab ${activeTab === "comments" ? "active" : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              💬 Comments
            </button>
            <button
              className={`task-modal-tab ${activeTab === "attachments" ? "active" : ""}`}
              onClick={() => setActiveTab("attachments")}
            >
              📎 Attachments
            </button>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input
                id="task-title-input"
                type="text"
                className="form-input"
                placeholder="e.g. Design the landing page"
                value={form.title}
                disabled={!isAdmin}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                id="task-desc-input"
                className="form-textarea"
                placeholder="Describe what needs to be done…"
                value={form.description}
                disabled={!isAdmin}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ minHeight: "80px" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select
                  id="task-status-select"
                  className="form-select"
                  value={form.status}
                  disabled={!canEditStatus}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Priority</label>
                <select
                  id="task-priority-select"
                  className="form-select"
                  value={form.priority}
                  disabled={!isAdmin}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Due Date</label>
                <input
                  id="task-due-input"
                  type="date"
                  className="form-input"
                  value={form.dueDate}
                  disabled={!isAdmin}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assign To</label>
                <select
                  id="task-assignee-select"
                  className="form-select"
                  value={form.assignedTo}
                  disabled={!isAdmin}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                id="task-save-btn"
                className="btn btn-primary"
                disabled={saving || (!isAdmin && !canEditStatus)}
              >
                {saving ? (
                  <><span className="spinner" /> Saving…</>
                ) : isEdit ? (
                  isAdmin ? "Save Changes" : "Update Status"
                ) : (
                  "Create Task"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && isEdit && (
          <div style={{ padding: "0 24px 24px" }}>
            <CommentThread taskId={task._id} />
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === "attachments" && isEdit && (
          <div style={{ padding: "0 24px 24px" }}>
            <TaskAttachments taskId={task._id} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TaskBoard (Main Export) ───────────────────────────────────────────────────
export default function TaskBoard({ projectId, projectMembers = [] }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskAPI.getAll({ project: projectId });
      setTasks(res.data.tasks || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleSave = (savedTask, mode) => {
    if (mode === "create") {
      setTasks((prev) => [...prev, savedTask]);
      setShowCreateModal(false);
    } else {
      setTasks((prev) => prev.map((t) => (t._id === savedTask._id ? savedTask : t)));
      setSelectedTask(null);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await taskAPI.update(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.data.task : t))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task status.");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await taskAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch { /* silent */ }
  };

  const tasksByCol = (colKey) => tasks.filter((t) => t.status === colKey);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="task-board-section">
      {/* Section Header */}
      <div className="task-board-header">
        <div>
          <h2 className="task-board-title">
            <span>✅</span> Tasks
          </h2>
          {totalTasks > 0 && (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              {doneTasks} / {totalTasks} completed
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            id="add-task-btn"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <span>+</span> Add Task
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="task-progress-bar">
          <div
            className="task-progress-fill"
            style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%` }}
          />
        </div>
      )}

      {/* Board Columns */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <span className="spinner" style={{ width: "28px", height: "28px" }} />
        </div>
      ) : (
        <div className="task-board-columns">
          {COLUMNS.map((col) => {
            const colTasks = tasksByCol(col.key);
            return (
              <div key={col.key} className="task-column">
                <div className="task-column-header">
                  <div className="task-column-label">
                    <span
                      className="task-column-dot"
                      style={{ background: col.color }}
                    />
                    <span style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="task-column-count">{colTasks.length}</span>
                </div>

                <div className="task-column-body" style={{ background: col.bg }}>
                  {colTasks.length === 0 ? (
                    <div className="task-column-empty">
                      <span>—</span>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        isAdmin={isAdmin}
                        currentUser={user}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onClick={(t) => setSelectedTask(t)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskModal
          mode="create"
          projectId={projectId}
          projectMembers={projectMembers}
          onClose={() => setShowCreateModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Edit Task Modal (with Comments tab) */}
      {selectedTask && (
        <TaskModal
          mode="edit"
          task={selectedTask}
          projectId={projectId}
          projectMembers={projectMembers}
          onClose={() => setSelectedTask(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
