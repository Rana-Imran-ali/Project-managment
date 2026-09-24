import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { projectAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import TaskBoard from "../components/TaskBoard";
import ActivityFeed from "../components/ActivityFeed";
import TeamManagementModal from "../components/TeamManagementModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "",
    deadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const res = await projectAPI.getById(id);
        const p = res.data.project;
        setProject(p);
        setEditForm({
          name: p.name || "",
          description: p.description || "",
          status: p.status || "planning",
          deadline: p.deadline ? p.deadline.slice(0, 10) : "",
        });
      } catch (err) {
        console.error("Fetch project error:", err);
        setError(err.response?.data?.message || "Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await projectAPI.update(id, editForm);
      setProject(res.data.project);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    try {
      const res = await projectAPI.update(id, { status: newStatus });
      setProject(res.data.project);
      setEditForm((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Failed to update project status.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this project?")) return;
    try {
      await projectAPI.delete(id);
      navigate("/projects");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete project.");
    }
  };

  // Called when TeamManagementModal updates the project (add/remove member)
  const handleProjectUpdated = (updatedProject) => {
    setProject(updatedProject);
    setEditForm((prev) => ({
      ...prev,
      name: updatedProject.name || prev.name,
      description: updatedProject.description || prev.description,
      status: updatedProject.status || prev.status,
      deadline: updatedProject.deadline
        ? updatedProject.deadline.slice(0, 10)
        : prev.deadline,
    }));
  };

  // Inline remove member (admin shortcut from member list)
  const handleInlineRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from this project?`)) return;
    setRemovingMember(member._id);
    try {
      const res = await projectAPI.removeMember(id, member._id);
      handleProjectUpdated(res.data.project);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemovingMember(null);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <span className="spinner" style={{ width: "32px", height: "32px" }} />
        <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Loading project…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !project) {
    return (
      <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>Error</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          {error || "Project not found."}
        </p>
        <Link to="/projects" className="btn btn-primary">Back to Projects</Link>
      </div>
    );
  }

  const formattedDeadline = project.deadline
    ? new Date(project.deadline).toLocaleDateString(undefined, {
        month: "long", day: "numeric", year: "numeric",
      })
    : "No deadline set";

  const formattedCreated = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      })
    : "Unknown";

  // All members: owner + members array (deduped)
  const allMembers = (() => {
    const map = new Map();
    if (project.owner?._id) map.set(project.owner._id, { ...project.owner, isOwner: true });
    (project.members || []).forEach((m) => {
      if (m._id && !map.has(m._id)) map.set(m._id, m);
    });
    return [...map.values()];
  })();

  return (
    <div>
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <Link
          to="/projects"
          style={{
            color: "var(--text-secondary)",
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Back to Projects
        </Link>
      </div>

      {/* ── Project Header Card ─────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "36px", marginBottom: "28px" }}>
        {isEditing ? (
          /* ── Edit Form ──────────────────────────────────────────────────── */
          <form onSubmit={handleUpdate}>
            <h2 style={{ marginBottom: "20px" }}>Edit Project</h2>

            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="form-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          /* ── View Mode ──────────────────────────────────────────────────── */
          <div>
            {/* Title + Actions row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <h1 style={{ fontSize: "28px", margin: 0 }}>{project.name}</h1>
                  <span className={`badge badge-${project.status}`}>
                    {project.status.replace("_", " ")}
                  </span>
                </div>
                <p style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "13px" }}>
                  Created on {formattedCreated}
                </p>
              </div>

              {isAdmin && (
                <div style={{ display: "flex", gap: "10px", flexShrink: 0, flexWrap: "wrap" }}>
                  <button
                    id="manage-team-btn"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsTeamModalOpen(true)}
                  >
                    👥 Manage Team
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditing(true)}
                  >
                    ✏️ Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.7",
                color: project.description ? "var(--text-primary)" : "var(--text-muted)",
                marginBottom: "24px",
                whiteSpace: "pre-wrap",
              }}
            >
              {project.description || "No description provided for this project."}
            </p>

            {/* Meta grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Owner */}
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Owner
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                  <Avatar name={project.owner?.name} size={28} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "14px" }}>{project.owner?.name || "Unknown"}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{project.owner?.email}</p>
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Deadline
                </span>
                <p style={{ fontWeight: 600, marginTop: "6px", fontSize: "14px" }}>
                  📅 {formattedDeadline}
                </p>
              </div>

              {/* Quick status */}
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Status
                </span>
                <div style={{ marginTop: "6px" }}>
                  {isAdmin ? (
                    <select
                      className="form-select"
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                      value={project.status}
                      onChange={(e) => handleQuickStatusChange(e.target.value)}
                    >
                      <option value="planning">Planning</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${project.status}`}>
                      {project.status.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Members Section ─────────────────────────────────────────── */}
            <div style={{ marginTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    margin: 0,
                  }}
                >
                  Team Members ({allMembers.length})
                </h3>
                {isAdmin && (
                  <button
                    id="manage-team-inline-btn"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsTeamModalOpen(true)}
                    style={{ fontSize: "12px", padding: "5px 12px" }}
                  >
                    👥 Manage
                  </button>
                )}
              </div>

              {allMembers.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  No team members yet.
                  {isAdmin && ' Click "Manage Team" to add members.'}
                </p>
              ) : (
                <div className="members-list">
                  {allMembers.map((m) => (
                    <div
                      key={m._id}
                      className="member-chip"
                      style={{ alignItems: "center" }}
                    >
                      <Avatar name={m.name} size={30} />
                      <div style={{ flex: 1 }}>
                        <p className="member-name">
                          {m.name}
                          {m.isOwner && (
                            <span className="member-owner-badge">Owner</span>
                          )}
                        </p>
                        <p className="member-email">{m.email}</p>
                      </div>
                      {/* Admin inline remove (only for non-owner members) */}
                      {isAdmin && !m.isOwner && (
                        <button
                          id={`remove-member-inline-${m._id}`}
                          title={`Remove ${m.name}`}
                          onClick={() => handleInlineRemoveMember(m)}
                          disabled={removingMember === m._id}
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: "6px",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(239,68,68,0.2)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(239,68,68,0.1)")
                          }
                        >
                          {removingMember === m._id ? "…" : "✕"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Task Board ─────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "28px", marginBottom: "28px" }}>
        <TaskBoard projectId={id} projectMembers={allMembers} />
      </div>

      {/* ── Activity Feed ──────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "28px" }}>
        <ActivityFeed projectId={id} />
      </div>

      {/* ── Team Management Modal ──────────────────────────────────────────── */}
      {isTeamModalOpen && (
        <TeamManagementModal
          projectId={id}
          projectName={project.name}
          members={(project.members || []).filter(
            (m) => m._id !== project.owner?._id
          )}
          owner={project.owner}
          onClose={() => setIsTeamModalOpen(false)}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
    </div>
  );
}

export default ProjectDetails;
