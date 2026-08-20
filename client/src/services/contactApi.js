import apiClient from "./apiClient";

/**
 * Submit a public contact/support form (Issue #1793).
 *
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} [payload.organization]
 * @param {string} payload.department
 * @param {string} payload.subject
 * @param {string} payload.message
 */
export async function submitContactForm({
  name,
  email,
  organization,
  department,
  subject,
  message,
}) {
  return apiClient.post("/api/contact", {
    name,
    email,
    organization,
    department,
    subject,
    message,
  });
}

export default submitContactForm;
