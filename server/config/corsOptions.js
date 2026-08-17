const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  // Production SPA (Vercel). Also set CLIENT_URL on Render to the same origin.
  "https://meetonmemory.vercel.app",
];

const parseOrigin = (raw, sourceLabel) => {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  try {
    return new URL(raw.trim()).origin;
  } catch {
    console.warn(
      `Ignored invalid ${sourceLabel} environment variable for origin validation`,
    );
    return null;
  }
};

const parseTrustedClientOrigin = () =>
  parseOrigin(process.env.CLIENT_URL, "CLIENT_URL") ||
  parseOrigin(process.env.FRONTEND_URL, "FRONTEND_URL");

const parseAllowedOriginsEnv = () => {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || typeof raw !== "string") {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => parseOrigin(entry, "ALLOWED_ORIGINS"))
    .filter(Boolean);
};

export const allowedOrigins = [
  ...new Set(
    [
      ...DEFAULT_ALLOWED_ORIGINS,
      parseTrustedClientOrigin(),
      ...parseAllowedOriginsEnv(),
    ].filter(Boolean),
  ),
];

export const corsOptions = {
  origin: function (origin, callback) {
    // Explicitly reject null origin string (sandboxed iframes, opaque origins)
    if (origin === "null") {
      console.warn("Blocked by CORS: null origin");
      return callback(new Error("Not allowed by CORS"));
    }

    // Allow requests without Origin header (e.g. server-to-server, cURL, same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Validate origin against allowed origins list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked by CORS: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  // Required for axios `withCredentials: true` (Clerk Bearer + residual cookies).
  // Safe because `origin` never reflects `*` — only allowlisted origins.
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
