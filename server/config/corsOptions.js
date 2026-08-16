const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
];

const parseTrustedClientOrigin = () => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) {
    return null;
  }

  try {
    return new URL(clientUrl).origin;
  } catch {
    console.warn(
      "Ignored invalid CLIENT_URL environment variable for origin validation",
    );
    return null;
  }
};

export const allowedOrigins = [
  ...DEFAULT_ALLOWED_ORIGINS,
  parseTrustedClientOrigin(),
].filter(Boolean);

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
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
