import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

// Layout wrapper for authenticated and main dashboard pages
function MainLayout() {
  const { isAuthenticated, loading } = useAuth();
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
    refreshCounts();
  }, [location.pathname]);

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
            <Route
              path="/"
              element={
                <Dashboard
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <Projects
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              }
            />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route
              path="/create-project"
              element={<CreateProject isOpen={true} />}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
            // Trigger refresh event if needed
            window.location.reload();
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
        <MainLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;