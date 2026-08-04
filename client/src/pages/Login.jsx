import React, { useContext, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import AppContent from "../context/AppContent";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi } from "../services";
import { validateRedirect } from "../utils/validateRedirect";
import AuthPageShell from "../components/AuthPageShell";
import {
  meetOnMemoryClerkAppearance,
  meetOnMemoryClerkInitialValues,
} from "../config/clerkAppearance";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const resolveReturnUrl = (location, userData) => {
  const from = location.state?.from;
  const redirect = location.state?.redirect;
  return (
    (from?.pathname ? `${from.pathname}${from.search || ""}` : null) ||
    redirect ||
    (userData?.hasCompletedOnboarding === false
      ? "/organizations"
      : "/dashboard")
  );
};

const BootstrapPending = ({ title }) => (
  <AuthPageShell title={title}>
    <div className="text-center space-y-3 py-8">
      <div className="mx-auto h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      <p className="text-slate-300 text-sm">Finishing sign-in…</p>
    </div>
  </AuthPageShell>
);

const LoginInner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedin, userData, loading, initializeAuth, setLoading } =
    useContext(AppContent);
  const { isSignedIn, isLoaded: clerkLoaded, getToken } = useAuth();
  const { signOut } = useClerk();

  const fallbackRedirectUrl = useMemo(
    () => resolveReturnUrl(location, userData),
    [location, userData],
  );

  useEffect(() => {
    if (!loading && isLoggedin && userData) {
      navigate(resolveReturnUrl(location, userData), { replace: true });
    }

    toast.success(`Welcome, ${welcomeName || user.name}!`);

    const defaultRedirect = user.hasCompletedOnboarding ? "/dashboard" : "/organizations";
    const from = location.state?.from?.pathname;
    
    const safeRedirect = validateRedirect(from, defaultRedirect);
    navigate(safeRedirect, { replace: true });
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (state === "Sign Up") {
        const { data } = await authApi.register({
          name,
          email,
          password,
        });

        if (!data.success) {
          toast.error(data.message || "Register failed");
          return;
        }

        toast.success("Account created successfully!");
        // Register already sets the session cookie
        await finishAuth(name);
        return;
      }

      const { data: loginData } = await authApi.login({
        email,
        password,
      });

      if (loginData.success) {
        await finishAuth();
      } else {
        toast.error(loginData.message || "Login failed");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Network or server error.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-linear-to-br from-blue-200 to-purple-400 dark:from-gray-900 dark:to-slate-900 overflow-hidden px-4 sm:px-6">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[128px] " />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[128px] "
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[96px]" />
      </div>

      {/* Logo */}
      <img
        onClick={() => navigate("/")}
        src={assets.logo}
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer transition-all duration-300 hover:scale-105 hover:opacity-90 z-20"
      />

      {/* Auth Card */}
      <div className="relative w-full max-w-md bg-slate-900 backdrop-blur-2xl border border-slate-700/40 rounded-2xl shadow-2xl shadow-black/20 p-8 sm:p-10 z-10 transition-all duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            {state === "Sign Up"
              ? t("login.createAccount")
              : t("login.welcomeBack")}
  }, [loading, isLoggedin, userData, navigate, location]);

  // Never mount <SignIn /> while Clerk is still loading or Mongo bootstrap runs —
  // Clerk auto-redirects signed-in users to fallbackRedirectUrl and that fights
  // ProtectedRoute's Navigate to /login.
  if (!clerkLoaded || loading) {
    return <BootstrapPending title="Sign in to MeetOnMemory" />;
  }

  if (isSignedIn && !isLoggedin) {
    return (
      <AuthPageShell title="Sign in to MeetOnMemory">
        <div className="text-center space-y-4 py-6">
          <h1 className="text-xl font-semibold text-white">
            Couldn&apos;t finish sign-in
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your Clerk session is active, but MeetOnMemory could not load your
            account. Retry or sign out and try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400"
              onClick={async () => {
                setLoading(true);
                try {
                  const token = await getToken();
                  await initializeAuth(
                    token ? { authorization: `Bearer ${token}` } : {},
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              Retry
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-800"
              onClick={() => signOut({ redirectUrl: "/login" })}
            >
              Sign out
            </button>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title="Sign in to MeetOnMemory">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/signup"
        fallbackRedirectUrl={fallbackRedirectUrl}
        appearance={meetOnMemoryClerkAppearance}
        initialValues={meetOnMemoryClerkInitialValues}
      />
    </AuthPageShell>
  );
};

const Login = () => {
  if (!clerkPubKey || clerkPubKey.trim().length === 0) {
    return (
      <AuthPageShell title="Sign in unavailable">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Authentication unavailable
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            MeetOnMemory requires Clerk. Set{" "}
            <code className="text-indigo-300">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
            and restart the client.
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return <LoginInner />;
};

export default Login;
