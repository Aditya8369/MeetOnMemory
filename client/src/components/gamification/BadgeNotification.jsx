import React, { useEffect } from "react";
import { toast } from "react-toastify";
import io from "socket.io-client";

// This component can be mounted at the top level of the app (e.g. in App.jsx or Dashboard.jsx)
const BadgeNotification = () => {
  useEffect(() => {
    // We assume the user is connected to a socket at the root level, but for gamification we can listen here
    // or rely on a global socket instance if passed down.
    // Ideally this listens to the 'gamification.badgesUnlocked' event we will emit.

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
      withCredentials: true,
    });

    socket.on("badge_unlocked", (data) => {
      data.badges.forEach((badge) => {
        toast.success(`🎉 Badge Unlocked: ${badge.name}!`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
          onClick: () => {
            window.location.assign(
              badge._id ? `/badges#badge-${badge._id}` : "/badges",
            );
          },
        });
      });
    });

    return () => {
      socket.off("badge_unlocked");
      socket.disconnect();
    };
  }, []);

  return null; // This is a headless component for notifications
};

export default BadgeNotification;
