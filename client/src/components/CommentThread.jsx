import { useState, useEffect, useRef } from "react";
import { commentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, size = 28 }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <div
      className="user-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CommentThread({ taskId }) {
  const { user } = useAuth();
  const socket   = useSocket();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef(null);

  // ── Initial fetch ──────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    fetchComments();
  }, [taskId]);

  // ── Socket: join task room & listen for comment events ────────
  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit("join-task", taskId);

    const onCreated = (comment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === comment._id)) return prev;
        return [...prev, comment];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };

    const onUpdated = (comment) => {
      setComments((prev) =>
        prev.map((c) => (c._id === comment._id ? comment : c))
      );
    };

    const onDeleted = ({ _id }) => {
      setComments((prev) => prev.filter((c) => c._id !== _id));
    };

    socket.on("comment:created", onCreated);
    socket.on("comment:updated", onUpdated);
    socket.on("comment:deleted", onDeleted);

    return () => {
      socket.emit("leave-task", taskId);
      socket.off("comment:created", onCreated);
      socket.off("comment:updated", onUpdated);
      socket.off("comment:deleted", onDeleted);
    };
  }, [socket, taskId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await commentAPI.getByTask(taskId);
      setComments(res.data.comments || []);
    } catch { /* silent */ }
    setLoading(false);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const res = await commentAPI.create({ content, task: taskId });
      // Optimistically add; socket will broadcast to other clients
      setComments((prev) => {
        if (prev.some((c) => c._id === res.data.comment._id)) return prev;
        return [...prev, res.data.comment];
      });
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { /* silent */ }
    setSubmitting(false);
  };

  const handleEditSave = async (id) => {
    const content = editText.trim();
    if (!content) return;
    try {
      const res = await commentAPI.update(id, { content });
      setComments((prev) =>
        prev.map((c) => (c._id === id ? res.data.comment : c))
      );
      setEditingId(null);
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await commentAPI.delete(id);
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch { /* silent */ }
  };

  return (
    <div className="comment-thread">
      <h4 className="comment-thread-title">
        <span>💬</span> Comments
        <span className="comment-count">{comments.length}</span>
      </h4>

      {/* List */}
      <div className="comment-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <span className="spinner" />
          </div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">
            <span>🗨️</span>
            <p>No comments yet. Be the first!</p>
          </div>
        ) : (
          comments.map((c) => {
            const isOwner = user?._id === (c.user?._id || c.user);
            const isEditing = editingId === c._id;

            return (
              <div key={c._id} className="comment-item">
                <Avatar name={c.user?.name} size={32} />

                <div className="comment-content">
                  <div className="comment-meta">
                    <span className="comment-author">{c.user?.name || "Unknown"}</span>
                    <span className="comment-time">{timeAgo(c.createdAt)}</span>
                  </div>

                  {isEditing ? (
                    <div className="comment-edit-area">
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: "70px", fontSize: "13px" }}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleEditSave(c._id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-text">{c.content}</p>
                  )}

                  {isOwner && !isEditing && (
                    <div className="comment-actions">
                      <button
                        className="comment-action-link"
                        onClick={() => { setEditingId(c._id); setEditText(c.content); }}
                      >
                        Edit
                      </button>
                      <span style={{ color: "var(--text-muted)" }}>·</span>
                      <button
                        className="comment-action-link comment-action-link--del"
                        onClick={() => handleDelete(c._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="comment-form" onSubmit={handleSubmit}>
        <Avatar name={user?.name} size={32} />
        <div className="comment-input-area">
          <textarea
            id="comment-input"
            className="form-textarea"
            style={{ minHeight: "60px", fontSize: "13px" }}
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(e);
            }}
          />
          <div className="comment-form-footer">
            <span className="comment-hint">Ctrl+Enter to submit</span>
            <button
              type="submit"
              id="comment-submit-btn"
              className="btn btn-primary btn-sm"
              disabled={submitting || !text.trim()}
            >
              {submitting ? <span className="spinner" /> : "Post"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
