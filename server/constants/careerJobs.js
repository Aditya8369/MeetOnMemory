/**
 * Canonical public job identifiers for careers applications.
 * Must stay aligned with client/src/pages/Careers.jsx listings.
 */
export const CAREER_JOBS = {
  "sr-frontend": { title: "Senior Frontend Engineer" },
  "ai-engineer": { title: "AI / NLP Research Engineer" },
  "product-designer": { title: "Product Designer (UI/UX)" },
  "marketing-manager": { title: "Product Marketing Manager" },
  "intern-gemini": { title: "Software Engineer Intern (Gemini Integrations)" },
  "grad-pm": { title: "Graduate Product Manager" },
  general: { title: "General Application" },
};

export const CAREER_JOB_IDS = Object.keys(CAREER_JOBS);

export const isValidCareerJobId = (jobId) =>
  typeof jobId === "string" && CAREER_JOB_IDS.includes(jobId.trim());

export default CAREER_JOBS;
