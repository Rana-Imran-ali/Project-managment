import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ onOpenCreateModal }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <div className="brand-icon">⚡</div>
        <span>ProManage</span>
      </Link>

      {/* Navigation links — only visible when logged in */}
      {isAuthenticated && (
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link
            to="/projects"
            className={`nav-link ${
              location.pathname.startsWith("/projects") ? "active" : ""
            }`}
          >
            Projects
          </Link>
        </div>
      )}

      <div className="nav-user">
        {isAuthenticated ? (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenCreateModal}
            >
              <span>+</span> New Project
            </button>

            <div className="user-badge">
              <div className="user-avatar">{initials}</div>
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role || "member"}</span>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              title="Logout"
            >
              Logout
            </button>
          </>
        ) : (
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
