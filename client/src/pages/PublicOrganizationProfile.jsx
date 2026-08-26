import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { organizationApi, membershipRequestApi } from "../services";
import AppContent from "../context/AppContent";
import { toast } from "react-toastify";
import {
  Building2,
  Users,
  Calendar,
  Globe,
  Shield,
  Tag,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Clock,
  ArrowLeft,
  UserPlus,
  UserCheck,
} from "lucide-react";
import OrganizationBanner from "../components/organization/OrganizationBanner.jsx";
import OrganizationLogo from "../components/organization/OrganizationLogo.jsx";

const PublicOrganizationProfile = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isLoggedin, getUserData, setUserData } = useContext(AppContent);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState("none");
  const [actionLoading, setActionLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const resolveMembershipStatus = useCallback(
    async (organizationId) => {
      if (!isLoggedin) {
        setMembershipStatus("none");
        return;
      }

      try {
        const [orgsResponse, requestsResponse] = await Promise.all([
          organizationApi.getUserOrganizations(),
          membershipRequestApi.getUserRequests(),
        ]);

        const joined =
          orgsResponse.data.success &&
          (orgsResponse.data.organizations || []).some(
            (org) => org._id === organizationId,
          );

        if (joined) {
          setMembershipStatus("member");
          return;
        }

        const requests = requestsResponse.data.success
          ? requestsResponse.data.requests || []
          : [];
        const orgRequest = requests.find(
          (req) => req.organization._id === organizationId,
        );

        if (orgRequest?.status === "pending") {
          setMembershipStatus("pending");
        } else if (orgRequest?.status === "rejected") {
          setMembershipStatus("rejected");
        } else {
          setMembershipStatus("none");
        }
      } catch (err) {
        console.error("Error resolving membership status:", err);
        setMembershipStatus("none");
      }
    },
    [isLoggedin],
  );

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } =
          await organizationApi.getPublicOrganizationBySlug(slug);

        if (data.success) {
          setOrganization(data.organization);
          await resolveMembershipStatus(data.organization._id);
        } else {
          setError(data.message || "Failed to load organization");
        }
      } catch (err) {
        console.error("Error fetching organization:", err);
        if (err.response?.status === 404) {
          setError("Organization not found");
        } else {
          setError(
            err.response?.data?.message || "Failed to load organization",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchOrganization();
    }
  }, [slug, resolveMembershipStatus]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleJoinOrganization = async () => {
    if (!organization) return;

    try {
      setActionLoading(true);
      const { data } = await organizationApi.joinOrganization({
        organizationId: organization._id,
      });

      if (data.success) {
        toast.success("Joined organization successfully!");
        setMembershipStatus("member");
        const updatedUser = await getUserData();
        if (updatedUser) {
          setUserData(updatedUser);
          localStorage.setItem("userData", JSON.stringify(updatedUser));
        }
      } else {
        toast.error(data.message || "Failed to join organization");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join organization");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAccess = () => {
    if (!isLoggedin) {
      navigate("/login", { state: { from: `/organizations/${slug}` } });
      return;
    }

    if (membershipStatus === "pending") {
      toast.info("You already have a pending request for this organization");
      return;
    }

    setShowRequestModal(true);
  };

  const handlePrimaryAction = () => {
    if (!isLoggedin) {
      navigate("/login", { state: { from: `/organizations/${slug}` } });
      return;
    }

    if (organization?.joinPolicy === "open") {
      handleJoinOrganization();
      return;
    }

    handleRequestAccess();
  };

  const handleSubmitRequest = async () => {
    if (!organization) return;

    try {
      setActionLoading(true);
      const { data } = await membershipRequestApi.createRequest({
        organizationId: organization._id,
        message: requestMessage,
      });

      if (data.success) {
        toast.success("Membership request submitted successfully");
        setMembershipStatus("pending");
        setShowRequestModal(false);
        setRequestMessage("");
      } else {
        toast.error(data.message || "Failed to submit request");
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error(err.response?.data?.message || "Failed to submit request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!organization) return;

    try {
      setActionLoading(true);
      const { data } = await membershipRequestApi.getUserRequests();
      if (data.success && data.requests) {
        const pendingRequest = data.requests.find(
          (req) =>
            req.organization._id === organization._id &&
            req.status === "pending",
        );
        if (pendingRequest) {
          await membershipRequestApi.cancelRequest(pendingRequest._id);
          toast.success("Request cancelled successfully");
          setMembershipStatus("none");
        }
      }
    } catch (err) {
      console.error("Error cancelling request:", err);
      toast.error(err.response?.data?.message || "Failed to cancel request");
    } finally {
      setActionLoading(false);
    }
  };

  const renderMembershipAction = (fullWidth = false) => {
    if (!isLoggedin) {
      return (
        <button
          onClick={() =>
            navigate("/login", { state: { from: `/organizations/${slug}` } })
          }
          className={`${fullWidth ? "w-full" : ""} px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl`}
        >
          Sign in to Join
        </button>
      );
    }

    if (membershipStatus === "member") {
      return (
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium ${fullWidth ? "w-full justify-center" : ""}`}
        >
          <UserCheck className="w-4 h-4" />
          Member
        </span>
      );
    }

    if (membershipStatus === "pending") {
      return (
        <div className={`flex items-center gap-2 ${fullWidth ? "w-full" : ""}`}>
          <span className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending
          </span>
          <button
            onClick={handleCancelRequest}
            disabled={actionLoading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Cancel
          </button>
        </div>
      );
    }

    if (membershipStatus === "rejected") {
      return (
        <span className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium">
          Request Rejected
        </span>
      );
    }

    if (organization?.joinPolicy === "invite_only") {
      return (
        <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium">
          Invite only — contact an admin for access
        </span>
      );
    }

    const isOpenJoin = organization?.joinPolicy === "open";
    const label = isOpenJoin ? "Join Organization" : "Request Access";
    const Icon = isOpenJoin ? UserPlus : UserPlus;

    return (
      <button
        onClick={handlePrimaryAction}
        disabled={actionLoading}
        className={`${fullWidth ? "w-full" : ""} px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50`}
      >
        {actionLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Icon className="w-4 h-4" />
            {label}
          </>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="flex items-start gap-6 mb-8">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                <div className="flex-1">
                  <div className="h-8 w-96 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                  <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {error === "Organization not found"
                ? "Organization Not Found"
                : "Error"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error === "Organization not found"
                ? "The organization you're looking for doesn't exist or may have been removed."
                : error}
            </p>
            <div className="flex flex-col gap-2">
              {isLoggedin && (
                <button
                  onClick={() => navigate("/browse-organizations")}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Browse Organizations
                </button>
              )}
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-xl font-semibold transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  const {
    name,
    description,
    logo,
    logoUrl,
    bannerUrl,
    memberCount,
    visibility,
    joinPolicy,
    createdAt,
    website,
    socialLinks,
    tags,
  } = organization;

  const resolvedLogo = logoUrl || logo || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <OrganizationBanner src={bannerUrl || ""} name={name} />

      <div className="max-w-6xl mx-auto px-4 -mt-24 pb-12">
        {isLoggedin && (
          <Link
            to="/browse-organizations"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse Organizations
          </Link>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <OrganizationLogo
                src={resolvedLogo}
                name={name}
                size="xl"
                className="shadow-xl"
              />

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {name}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      visibility === "public"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    {visibility?.charAt(0)?.toUpperCase() +
                      visibility?.slice(1) || "Private"}
                  </span>
                </div>

                {description && (
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                    {description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{memberCount || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(createdAt)}</span>
                  </div>
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0">{renderMembershipAction()}</div>
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="p-8 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="p-8 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Social Links
              </h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span className="capitalize">{platform}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Organization Details
                  </h4>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Visibility:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {visibility?.charAt(0)?.toUpperCase() +
                        visibility?.slice(1) || "Private"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Join Policy:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {(joinPolicy || "open").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Member Count:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {memberCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Membership
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {joinPolicy === "open"
                    ? "This organization accepts open join requests from authenticated users."
                    : joinPolicy === "invite_only"
                      ? "Membership is limited to invited users."
                      : "Submit a request and an admin will review your application."}
                </p>
                {renderMembershipAction(true)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Request Access
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Send a membership request to join{" "}
              <strong>{organization?.name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message (optional)
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Tell the organization why you'd like to join..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {requestMessage.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestMessage("");
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicOrganizationProfile;
