import React from "react";
import { Download, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import usePwa from "../../context/usePwa.jsx";

const PwaInstallButton = ({
  variant = "navbar",
  className = "",
  showWhenInstalled = false,
}) => {
  const { isInstallable, isInstalled, promptInstall } = usePwa();

  const handleInstall = async () => {
    try {
      const installed = await promptInstall();
      if (installed) {
        toast.success("MeetOnMemory installed to your device!");
      }
    } catch (error) {
      console.error("PWA install error:", error);
    }
  };

  if (isInstalled && showWhenInstalled) {
    return (
      <div
        data-testid="pwa-installed-badge"
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>Installed</span>
      </div>
    );
  }

  if (!isInstallable) {
    return null;
  }

  if (variant === "banner") {
    return (
      <div
        data-testid="pwa-install-banner"
        className={`p-4 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Install MeetOnMemory App</h4>
            <p className="text-xs text-blue-100 mt-0.5">
              Access meetings, transcripts, and notifications faster with our
              desktop and mobile app.
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="pwa-banner-install-btn"
          onClick={handleInstall}
          className="px-4 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          Install Now
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="pwa-install-btn"
      onClick={handleInstall}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-xl transition-all shadow-xs cursor-pointer ${className}`}
      title="Install MeetOnMemory as desktop / mobile app"
    >
      <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      <span>Install App</span>
    </button>
  );
};

export default PwaInstallButton;
