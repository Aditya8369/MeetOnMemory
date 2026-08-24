import React, { useState, useEffect, useCallback } from "react";
import { useUser, useClerk, useSession } from "@clerk/clerk-react";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  Loader2,
  ExternalLink,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * ClerkSecuritySection Component (#2020)
 * Handles 2FA (MFA) enrollment status & active session listing with revocation.
 */
const ClerkSecuritySection = () => {
  if (!clerkPubKey || clerkPubKey.trim().length === 0) {
    return <FallbackSecuritySection />;
  }

  return <ClerkSecurityInner />;
};

const ClerkSecurityInner = () => {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { session: currentSession } = useSession();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  const isTwoFactorEnabled = Boolean(
    user?.twoFactorEnabled || user?.totpEnabled || user?.backupCodeEnabled,
  );

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingSessions(true);
      const activeSessions = await user.getSessions();
      setSessions(activeSessions || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      toast.error("Failed to load active sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionToRevoke) => {
    try {
      setRevokingId(sessionToRevoke.id);
      await sessionToRevoke.revoke();
      toast.success("Session revoked successfully");
      await fetchSessions();
    } catch (err) {
      console.error("Error revoking session:", err);
      toast.error(err.message || "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const handleManageSecurity = () => {
    try {
      openUserProfile({ initialPage: "security" });
    } catch {
      openUserProfile();
    }
  };

  return (
    <div className="space-y-6" data-testid="clerk-security-section">
      {/* 2FA Row */}
      <div className="flex items-center justify-between py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          {isTwoFactorEnabled ? (
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Two-Factor Authentication (2FA)
              </p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isTwoFactorEnabled
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                }`}
              >
                {isTwoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isTwoFactorEnabled
                ? "Your account is protected with 2FA / TOTP authentication."
                : "Add an extra layer of security to your account with 2FA."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManageSecurity}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1"
        >
          <span>{isTwoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Active Sessions Listing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Sessions ({sessions.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={fetchSessions}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer font-medium"
          >
            Refresh
          </button>
        </div>

        {loadingSessions ? (
          <div className="flex items-center justify-center py-6 text-slate-500 text-xs">
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
            Loading active sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
            No active sessions found.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((sess) => {
              const isCurrent = sess.id === currentSession?.id;
              const lastActiveDate = sess.lastActiveAt
                ? new Date(sess.lastActiveAt).toLocaleString()
                : "Active now";

              return (
                <div
                  key={sess.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60"
                >
                  <div className="flex items-center gap-3">
                    {sess.latestActivity?.isMobile ? (
                      <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <Laptop className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {sess.latestActivity?.browserName || "Web Browser"} (
                          {sess.latestActivity?.deviceType || "Desktop"})
                        </p>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            This Device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        IP: {sess.latestActivity?.ipAddress || "Unknown"} • Last
                        active: {lastActiveDate}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess)}
                      disabled={revokingId === sess.id}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      title="Revoke session"
                    >
                      {revokingId === sess.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const FallbackSecuritySection = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Session & Account Security
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authenticated via HTTP-only JWT cookies with active session
              isolation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClerkSecuritySection;
