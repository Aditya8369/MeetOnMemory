// client/src/pages/JoinOrganizationPage.jsx
import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import AppContent from "../context/AppContent";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar.jsx";
import { invitationApi } from "../services";
import { Building2, Check, AlertTriangle } from "lucide-react";

const JoinOrganizationPage = () => {
  const { getUserData, setUserData } = useContext(AppContent);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(Boolean(token));
  const navigate = useNavigate();

  const [inviteDetails, setInviteDetails] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        const { data } = await invitationApi.getInvitationByToken(token);
        if (data.success) {
          setInviteDetails(data.invitation);
        } else {
          setInviteError(data.message || "Invalid invitation");
        }
      } catch (err) {
        console.error("Error loading invitation:", err);
        setInviteError(
          err.response?.data?.message || "Invalid or expired invitation",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  if (!token) {
    return <Navigate to="/browse-organizations" replace />;
  }

  const handleAcceptInvite = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      const { data } = await invitationApi.acceptInvitation(token);
      if (data.success) {
        toast.success("Invitation accepted! Welcome to the organization.");
        const updatedUser = await getUserData();
        if (updatedUser) {
          setUserData(updatedUser);
          localStorage.setItem("userData", JSON.stringify(updatedUser));
        }
        window.location.href = "/dashboard";
      } else {
        toast.error(data.message || "Failed to accept invitation");
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      toast.error(err.response?.data?.message || "Failed to accept invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      const { data } = await invitationApi.rejectInvitation(token);
      if (data.success) {
        toast.info("Invitation declined.");
        navigate("/organizations");
      } else {
        toast.error(data.message || "Failed to decline invitation");
      }
    } catch (err) {
      console.error("Error declining invitation:", err);
      toast.error(
        err.response?.data?.message || "Failed to decline invitation",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden mt-12">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">
                  Verifying invitation link...
                </p>
              </div>
            ) : inviteError ? (
              <div className="p-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 mb-2">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Invitation Invalid
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {inviteError}
                </p>
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => navigate("/browse-organizations")}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                  >
                    Browse Organizations
                  </button>
                  <button
                    onClick={() => navigate("/organizations")}
                    className="w-full py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all cursor-pointer"
                  >
                    Go to Organization Hub
                  </button>
                </div>
              </div>
            ) : inviteDetails ? (
              <div className="p-8 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-800/30 flex items-center justify-center mx-auto mb-4 overflow-hidden shrink-0">
                    {inviteDetails.organization?.logo ? (
                      <img
                        src={inviteDetails.organization.logo}
                        alt={inviteDetails.organization.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Invitation to Join
                  </h2>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {inviteDetails.organization?.name}
                  </p>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-2 border border-gray-100/40 dark:border-gray-700/40">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">
                    Invited By
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {inviteDetails.invitedBy?.name} (
                    {inviteDetails.invitedBy?.email})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Role offered:{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400 capitalize">
                      {inviteDetails.role}
                    </span>
                  </p>
                </div>

                {inviteDetails.message && (
                  <div className="bg-blue-50/30 dark:bg-blue-950/10 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                      Personal Message
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{inviteDetails.message}"
                    </p>
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleDeclineInvite}
                    disabled={actionLoading}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all cursor-pointer text-sm"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAcceptInvite}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md shadow-blue-600/10 cursor-pointer text-sm flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Accept & Join
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganizationPage;
