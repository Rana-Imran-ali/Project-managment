import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

function CreateProject({ isOpen = true, onClose, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning",
    deadline: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!user?._id && !user?.id) {
      setError("You must be logged in to create a project.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        deadline: formData.deadline || undefined,
        owner: user._id || user.id,
      };

      const res = await projectAPI.create(payload);

      if (onSuccess) {
        onSuccess(res.data.project);
      } else {
        navigate("/projects");
      }

      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Create project error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to create project. Please check your inputs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div style={{ padding: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "22px" }}>Create New Project</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Project Name *</label>
          <input
            type="text"
            name="name"
            className="form-input"
            placeholder="e.g. Website Redesign"
            value={formData.name}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            className="form-textarea"
            placeholder="Outline goals, deliverables, and expectations..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Deadline</label>
            <input
              type="date"
              name="deadline"
              className="form-input"
              value={formData.deadline}
              onChange={handleChange}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          {onClose && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Creating...
              </>
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // If used as modal
  if (onClose) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  // If used as standalone page
  return (
    <div style={{ maxWidth: "600px", margin: "40px auto" }} className="glass-card">
      {content}
    </div>
  );
}

export default CreateProject;
