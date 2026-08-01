import axios from "axios";
import { getBackendUrl } from "../config/backendConfig.js";

const backendUrl = getBackendUrl();

const apiClient = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

function applyFriendlyMessage(error, friendlyMessage) {
  if (!error.response) {
    error.response = { data: { message: friendlyMessage }, status: 0 };
  } else if (
    error.response.data &&
    typeof error.response.data === "object" &&
    !Array.isArray(error.response.data)
  ) {
    error.response.data.message = friendlyMessage;
  } else {
    error.response.data = { message: friendlyMessage };
  }
  error.message = friendlyMessage;
}

let clerkTokenGetter = null;

export const setClerkTokenGetter = (getterFn) => {
  clerkTokenGetter = getterFn;
};

/** Current Clerk session JWT for HTTP and Socket.IO auth */
export const getClerkBearerToken = async () => {
  if (!clerkTokenGetter || typeof clerkTokenGetter !== "function") {
    return null;
  }
  try {
    return await clerkTokenGetter();
  } catch (err) {
    console.warn("Failed to retrieve Clerk token", err);
    return null;
  }
};

/**
 * Socket.IO client options authenticated with the live Clerk session.
 */
export const createClerkSocketOptions = async (extra = {}) => {
  const token = await getClerkBearerToken();
  return {
    auth: token ? { token } : {},
    transports: ["websocket", "polling"],
    ...extra,
  };
};

const attachAuthorization = (headers, bearerValue) => {
  if (!headers) return;
  if (typeof headers.set === "function") {
    headers.set("Authorization", bearerValue);
    return;
  }
  headers.Authorization = bearerValue;
};

apiClient.interceptors.request.use(
  async (config) => {
    config.withCredentials = true;

    // Prefer an explicit Authorization already set by the caller (bootstrap).
    const existing =
      typeof config.headers?.get === "function"
        ? config.headers.get("Authorization")
        : config.headers?.Authorization;

    if (!existing) {
      const clerkToken = await getClerkBearerToken();
      if (clerkToken) {
        if (!config.headers) {
          config.headers = {};
        }
        attachAuthorization(config.headers, `Bearer ${clerkToken}`);
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error == null) {
      const friendlyMessage = "An unexpected error occurred. Please try again.";
      return Promise.reject({
        message: friendlyMessage,
        response: { data: { message: friendlyMessage }, status: 0 },
      });
    }

    let friendlyMessage = "An unexpected error occurred. Please try again.";

    if (!error.response) {
      if (!navigator.onLine) {
        friendlyMessage =
          "Network offline. Please check your internet connection.";
      } else {
        friendlyMessage =
          "Unable to reach the server. This may be a network issue or a CORS policy restriction.";
      }
    } else {
      switch (error.response.status) {
        case 401:
          friendlyMessage =
            error.response.data?.message ||
            "Session expired. Please log in again.";
          break;
        case 403:
          friendlyMessage =
            error.response.data?.message ||
            "You do not have permission to perform this action.";
          break;
        case 404:
          friendlyMessage = "The requested resource was not found.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          friendlyMessage = "Server unavailable. Please try again later.";
          break;
        default:
          if (error.response.data?.message) {
            friendlyMessage = error.response.data.message;
          }
          break;
      }
    }

    applyFriendlyMessage(error, friendlyMessage);
    return Promise.reject(error);
  },
);

export default apiClient;
