import { Link, useLocation } from "react-router-dom";

function Sidebar({ projectCounts = {}, onOpenCreateModal }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            paddingLeft: "12px",
          }}
        >
          Menu
        </span>
        <div className="sidebar-nav" style={{ marginTop: "8px" }}>
          <Link
            to="/"
            className={`sidebar-link ${location.pathname === "/" ? "active" : ""}`}
          >
            <span>📊</span> Dashboard
          </Link>
          <Link
            to="/projects"
            className={`sidebar-link ${
              location.pathname === "/projects" ? "active" : ""
            }`}
          >
            <span>📁</span> All Projects
            <span
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.08)",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "12px",
              }}
            >
              {projectCounts.total || 0}
            </span>
          </Link>
        </div>
      </div>

      <div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            paddingLeft: "12px",
          }}
        >
          Workflow Status
        </span>
        <div className="sidebar-nav" style={{ marginTop: "8px" }}>
          <Link
            to="/projects?status=in_progress"
            className="sidebar-link"
          >
            <span style={{ color: "#60a5fa" }}>●</span> In Progress
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text-muted)",
                fontSize: "12px",
              }}
            >
              {projectCounts.in_progress || 0}
            </span>
          </Link>

          <Link
            to="/projects?status=planning"
            className="sidebar-link"
          >
            <span style={{ color: "#facc15" }}>●</span> Planning
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text-muted)",
                fontSize: "12px",
              }}
            >
              {projectCounts.planning || 0}
            </span>
          </Link>

          <Link
            to="/projects?status=completed"
            className="sidebar-link"
          >
            <span style={{ color: "#34d399" }}>●</span> Completed
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text-muted)",
                fontSize: "12px",
              }}
            >
              {projectCounts.completed || 0}
            </span>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={onOpenCreateModal}
        >
          <span>+</span> Create Project
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
