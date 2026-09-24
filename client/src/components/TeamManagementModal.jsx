import { useState, useEffect, useRef, useCallback } from "react";
import { userAPI, projectAPI } from "../services/api";

// ─── Avatar Helper ────────────────────────────────────────────────────────────
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

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const colors = {
    admin: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "Admin" },
    manager: { bg: "rgba(139,92,246,0.15)", color: "#8b5cf6", label: "Manager" },
    member: { bg: "rgba(99,102,241,0.15)", color: "#6366f1", label: "Member" },
  };
  const c = colors[role] || colors.member;
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        letterSpacing: ".03em",
      }}
    >
      {c.label}
    </span>
  );
}

/**
 * TeamManagementModal
 * Props:
 *   - projectId: string
 *   - projectName: string
 *   - members: Array<{ _id, name, email, role }>
 *   - owner: { _id, name, email, role }
 *   - onClose: () => void
 *   - onProjectUpdated: (project) => void
 */
export default function TeamManagementModal({
  projectId,
  projectName,
  members = [],
  owner,
  onClose,
  onProjectUpdated,
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // userId being actioned
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  const searchTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Show toast and auto-dismiss
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await userAPI.search(query.trim());
        setSearchResults(res.data.users || []);
      } catch (err) {
        setSearchError(
          err.response?.data?.message || "Search failed. Please try again."
        );
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(searchTimerRef.current);
  }, [query]);

  const isCurrentMember = (userId) =>
    members.some((m) => m._id === userId) || owner?._id === userId;

  const handleAddMember = async (user) => {
    setActionLoading(user._id);
    try {
      const res = await projectAPI.addMember(projectId, user._id);
      onProjectUpdated(res.data.project);
      showToast(`✅ ${user.name} added to the project! They've been notified.`);
      // Clear that user from results to reflect change
      setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      showToast(
        err.response?.data?.message || `Failed to add ${user.name}.`,
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from "${projectName}"?`)) return;
    setActionLoading(member._id);
    try {
      const res = await projectAPI.removeMember(projectId, member._id);
      onProjectUpdated(res.data.project);
      showToast(`🗑️ ${member.name} removed from the project.`);
    } catch (err) {
      showToast(
        err.response?.data?.message || `Failed to remove ${member.name}.`,
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        id="team-modal-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        id="team-management-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Manage Team Members"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: "min(620px, 95vw)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-card, #1a1d2e)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)",
          overflow: "hidden",
          animation: "slideUp 0.25s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div
                style={{
                  width: 36, height: 36,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                👥
              </div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Manage Team</h2>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary, #94a3b8)" }}>
              {projectName}
            </p>
          </div>
          <button
            id="team-modal-close"
            onClick={onClose}
            title="Close"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "var(--text-secondary, #94a3b8)",
              width: 36, height: 36,
              cursor: "pointer",
              fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "var(--text-secondary, #94a3b8)";
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 28px" }}>

          {/* ── Search Section ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: "28px" }}>
            <label
              htmlFor="user-search-input"
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "var(--text-secondary, #94a3b8)",
                marginBottom: "10px",
              }}
            >
              🔍 Add Team Member
            </label>

            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <input
                id="user-search-input"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                style={{
                  width: "100%",
                  padding: "12px 44px 12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  color: "var(--text-primary, #e2e8f0)",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(99,102,241,0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.12)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {/* Spinner / icon */}
              <span
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "16px",
                  color: "var(--text-muted, #64748b)",
                  pointerEvents: "none",
                }}
              >
                {searching ? "⌛" : "🔍"}
              </span>
            </div>

            {/* Search error */}
            {searchError && (
              <p style={{ fontSize: "13px", color: "#ef4444", marginTop: "8px" }}>
                {searchError}
              </p>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                {searchResults.map((u, idx) => {
                  const already = isCurrentMember(u._id);
                  const loading = actionLoading === u._id;
                  return (
                    <div
                      key={u._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom:
                          idx < searchResults.length - 1
                            ? "1px solid rgba(255,255,255,0.06)"
                            : "none",
                        background: "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Avatar name={u.name} size={36} />
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "var(--text-primary, #e2e8f0)",
                            }}
                          >
                            {u.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "var(--text-muted, #64748b)",
                            }}
                          >
                            {u.email}
                          </p>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>

                      {already ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#22c55e",
                            fontWeight: 600,
                            padding: "4px 10px",
                            background: "rgba(34,197,94,0.1)",
                            borderRadius: "999px",
                          }}
                        >
                          ✓ Member
                        </span>
                      ) : (
                        <button
                          id={`add-member-btn-${u._id}`}
                          onClick={() => handleAddMember(u)}
                          disabled={loading || !!actionLoading}
                          style={{
                            padding: "7px 16px",
                            borderRadius: "8px",
                            border: "none",
                            background: loading
                              ? "rgba(99,102,241,0.4)"
                              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "opacity 0.2s, transform 0.15s",
                            opacity: actionLoading && !loading ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.transform = "scale(1.03)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          {loading ? "Adding…" : "+ Add"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state hint */}
            {query.trim().length >= 2 && !searching && searchResults.length === 0 && !searchError && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "16px",
                  textAlign: "center",
                  color: "var(--text-muted, #64748b)",
                  fontSize: "13px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                No users found for "{query}"
              </div>
            )}
          </div>

          {/* ── Current Members ────────────────────────────────────────────── */}
          <div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "var(--text-secondary, #94a3b8)",
                marginBottom: "12px",
              }}
            >
              👥 Current Team ({members.length + (owner ? 1 : 0)})
            </h3>

            {/* Owner */}
            {owner && (
              <div
                key={owner._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  marginBottom: "8px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Avatar name={owner.name} size={36} />
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "var(--text-primary, #e2e8f0)",
                      }}
                    >
                      {owner.name}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                      {owner.email}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  👑 Owner
                </span>
              </div>
            )}

            {/* Members */}
            {members.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--text-muted, #64748b)",
                  fontSize: "13px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  border: "1px dashed rgba(255,255,255,0.1)",
                }}
              >
                No additional members yet. Search above to add team members.
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {members.map((m, idx) => {
                  const loading = actionLoading === m._id;
                  return (
                    <div
                      key={m._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom:
                          idx < members.length - 1
                            ? "1px solid rgba(255,255,255,0.06)"
                            : "none",
                        background: "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Avatar name={m.name} size={36} />
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "var(--text-primary, #e2e8f0)",
                            }}
                          >
                            {m.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "var(--text-muted, #64748b)",
                            }}
                          >
                            {m.email}
                          </p>
                        </div>
                        <RoleBadge role={m.role} />
                      </div>

                      <button
                        id={`remove-member-btn-${m._id}`}
                        onClick={() => handleRemoveMember(m)}
                        disabled={loading || !!actionLoading}
                        title={`Remove ${m.name}`}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "8px",
                          border: "1px solid rgba(239,68,68,0.3)",
                          background: loading
                            ? "rgba(239,68,68,0.2)"
                            : "rgba(239,68,68,0.08)",
                          color: "#ef4444",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: loading ? "not-allowed" : "pointer",
                          transition: "all 0.2s",
                          opacity: actionLoading && !loading ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!loading)
                            e.currentTarget.style.background = "rgba(239,68,68,0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = loading
                            ? "rgba(239,68,68,0.2)"
                            : "rgba(239,68,68,0.08)";
                        }}
                      >
                        {loading ? "Removing…" : "🗑 Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-primary, #e2e8f0)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
            }
          >
            Done
          </button>
        </div>
      </div>

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 1100,
            maxWidth: "380px",
            padding: "14px 20px",
            borderRadius: "12px",
            background:
              toast.type === "error"
                ? "rgba(239,68,68,0.95)"
                : "rgba(34,197,94,0.95)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            backdropFilter: "blur(10px)",
            animation: "slideUp 0.25s ease",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}
