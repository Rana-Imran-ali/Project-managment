import { Link } from "react-router-dom";

function ProjectCard({ project, onDelete, onStatusChange }) {
  const { _id, name, description, status, deadline, owner } = project;

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No deadline";

  const ownerName = owner?.name || "Unassigned";

  return (
    <div className="glass-card project-card">
      <div>
        <div className="project-card-header">
          <Link to={`/projects/${_id}`}>
            <h3 className="project-title" hover-highlight="true">
              {name}
            </h3>
          </Link>
          <span className={`badge badge-${status}`}>
            {status.replace("_", " ")}
          </span>
        </div>

        <p className="project-desc">{description || "No description provided."}</p>
      </div>

      <div>
        <div className="project-meta">
          <div className="project-owner">
            <span style={{ fontSize: "15px" }}>👤</span>
            <span>{ownerName}</span>
          </div>

          <div title="Target Deadline">
            <span>📅 {formattedDeadline}</span>
          </div>
        </div>

        <div className="project-actions">
          <select
            className="form-select"
            style={{ padding: "6px 10px", fontSize: "12px", width: "auto" }}
            value={status}
            onChange={(e) => onStatusChange?.(_id, e.target.value)}
          >
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <Link
            to={`/projects/${_id}`}
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: "auto" }}
          >
            Details
          </Link>

          {onDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(_id)}
              title="Delete Project"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;