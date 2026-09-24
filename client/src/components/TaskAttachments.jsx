import { useState, useEffect, useRef } from "react";
import { attachmentAPI, getUploadUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getFileIcon(mimetype = "", filename = "") {
  if (mimetype.startsWith("image/")) return "🖼️";
  if (mimetype.includes("pdf")) return "📄";
  if (mimetype.includes("word") || filename.match(/\.(doc|docx)$/i)) return "📝";
  if (mimetype.includes("excel") || mimetype.includes("spreadsheet") || filename.match(/\.(xls|xlsx)$/i)) return "📊";
  if (mimetype.includes("zip") || filename.match(/\.(zip|rar|tar|gz)$/i)) return "🗜️";
  return "📎";
}

export default function TaskAttachments({ taskId }) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!taskId) return;
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await attachmentAPI.getByTask(taskId);
      setAttachments(res.data.attachments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attachments");
    }
    setLoading(false);
  };

  const handleUpload = async (file) => {
    if (!file) return;

    // Check size limit: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await attachmentAPI.upload(taskId, file);
      setAttachments((prev) => [res.data.attachment, ...prev]);
      setSuccessMsg("File uploaded successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload file");
    }
    setUploading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await attachmentAPI.delete(id);
      setAttachments((prev) => prev.filter((a) => a._id !== id));
      setSuccessMsg("Attachment deleted.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  return (
    <div className="task-attachments">
      <div className="task-attachments-header">
        <h4 className="comment-thread-title">
          <span>📎</span> Attachments
          <span className="comment-count">{attachments.length}</span>
        </h4>
      </div>

      {/* Status Messages */}
      {error && <div className="alert-banner alert-banner--error">{error}</div>}
      {successMsg && <div className="alert-banner alert-banner--success">{successMsg}</div>}

      {/* Upload Dropzone */}
      <div
        className={`attachment-dropzone ${dragActive ? "active" : ""} ${uploading ? "disabled" : ""}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div className="dropzone-content">
          <span className="dropzone-icon">{uploading ? "⏳" : "📤"}</span>
          <p className="dropzone-title">
            {uploading ? "Uploading file..." : "Click or drag & drop to upload"}
          </p>
          <span className="dropzone-hint">
            Supports Images, PDF, Word, Excel, ZIP (Max 10MB)
          </span>
        </div>
      </div>

      {/* Attachments List */}
      <div className="attachments-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <span className="spinner" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="attachment-empty">
            <span style={{ fontSize: "28px" }}>📁</span>
            <p>No attachments yet. Upload documents or images relevant to this task.</p>
          </div>
        ) : (
          attachments.map((item) => {
            const isImage = item.mimetype?.startsWith("image/");
            const fileUrl = getUploadUrl(item.filename);
            const isOwner =
              user?._id === (item.uploadedBy?._id || item.uploadedBy);
            const canDelete = isOwner || user?.role === "admin";

            return (
              <div key={item._id} className="attachment-item">
                {/* Thumbnail or Icon */}
                <div className="attachment-preview">
                  {isImage ? (
                    <img
                      src={fileUrl}
                      alt={item.originalName}
                      className="attachment-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="attachment-file-icon">
                      {getFileIcon(item.mimetype, item.originalName)}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="attachment-info">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-filename"
                    title={item.originalName}
                  >
                    {item.originalName}
                  </a>
                  <div className="attachment-meta">
                    <span>{formatBytes(item.size)}</span>
                    <span>•</span>
                    <span>{item.uploadedBy?.name || "User"}</span>
                    <span>•</span>
                    <span>{timeAgo(item.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="attachment-actions">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.originalName}
                    className="btn btn-secondary btn-sm attachment-download-btn"
                    title="Download / View"
                  >
                    ⬇
                  </a>
                  {canDelete && (
                    <button
                      className="notif-action-btn notif-action-btn--del"
                      onClick={() => handleDelete(item._id)}
                      title="Delete attachment"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
