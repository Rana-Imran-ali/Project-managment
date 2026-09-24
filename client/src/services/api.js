import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = localStorage.getItem("token");
      if (token) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  getMe: () => api.get("/auth/me"),
};

// Projects API endpoints
export const projectAPI = {
  getAll: () => api.get("/projects"),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post("/projects", projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (projectId, userId) =>
    api.post(`/projects/${projectId}/members`, { userId }),
  removeMember: (projectId, userId) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

// Tasks API endpoints
export const taskAPI = {
  getAll: (params) => api.get("/tasks", { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (taskData) => api.post("/tasks", taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Comments API endpoints
export const commentAPI = {
  getByTask: (taskId) => api.get(`/comment/task/${taskId}`),
  create: (commentData) => api.post("/comment", commentData),
  update: (id, commentData) => api.put(`/comment/${id}`, commentData),
  delete: (id) => api.delete(`/comment/${id}`),
};

// Notifications API endpoints
export const notificationAPI = {
  getAll: () => api.get("/notification"),
  getUnread: () => api.get("/notification/unread"),
  markAsRead: (id) => api.put(`/notification/${id}/read`),
  markAllAsRead: () => api.put("/notification/read-all"),
  delete: (id) => api.delete(`/notification/${id}`),
};

// Activities API endpoints
export const activityAPI = {
  getMy: () => api.get("/activities/my"),
  getByProject: (projectId) => api.get(`/activities/project/${projectId}`),
  getByTask: (taskId) => api.get(`/activities/task/${taskId}`),
};

// Users API endpoints (Admin)
export const userAPI = {
  search: (query) => api.get("/users/search", { params: { q: query } }),
};

// Attachments API endpoints
export const attachmentAPI = {
  getByTask: (taskId) => api.get(`/attachments/task/${taskId}`),
  upload: (taskId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/attachments/task/${taskId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  delete: (id) => api.delete(`/attachments/${id}`),
};

export const getUploadUrl = (filename) => {
  if (!filename) return "";
  const base = (
    import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  ).replace(/\/api\/?$/, "");
  return `${base}/uploads/${filename}`;
};

export default api;