import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { projectAPI } from "./services/api";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import CreateProject from "./pages/CreateProject";
import Login from "./pages/Login";
import Register from "./pages/Register";

import "./App.css";

// Bug #11 fix: Guard component — redirects unauthenticated users to /login.
// Returns null while auth status is still being verified to avoid
// a flash of the wrong page.
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Layout wrapper for the full app shell (navbar + sidebar + routes)
function MainLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectCounts, setProjectCounts] = useState({
    total: 0,
    planning: 0,
    in_progress: 0,
    completed: 0,
  });

  const refreshCounts = async () => {
    try {
      const res = await projectAPI.getAll();
      const list = res.data.projects || [];
      setProjectCounts({
        total: list.length,
        planning: list.filter((p) => p.status === "planning").length,
        in_progress: list.filter((p) => p.status === "in_progress").length,
        completed: list.filter((p) => p.status === "completed").length,
      });
    } catch {
      // Ignored if server offline or loading
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshCounts();
    }
  }, [location.pathname, isAuthenticated]);

  // Auth pages don't need the dashboard sidebar/navbar layout
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="app-container">
      <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />

      <div className="app-body">
        {!isAuthPage && (
          <Sidebar
            projectCounts={projectCounts}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        <main className="main-content">
          <Routes>
            {/* Protected routes — require login */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard onOpenCreateModal={() => setIsCreateModalOpen(true)} />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <PrivateRoute>
                  <Projects onOpenCreateModal={() => setIsCreateModalOpen(true)} />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <PrivateRoute>
                  <ProjectDetails />
                </PrivateRoute>
              }
            />
            <Route
              path="/create-project"
              element={
                <PrivateRoute>
                  <CreateProject isOpen={true} />
                </PrivateRoute>
              }
            />

            {/* Auth routes — redirect to dashboard if already logged in */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />
            <Route
              path="/register"
              element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {isCreateModalOpen && (
        <CreateProject
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refreshCounts();
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <MainLayout />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}


export default App;