import api from "./api"; // Assuming there is a base api config in this folder

/**
 * Fetch glossary terms
 * @param {Object} params { status, search }
 */
export const fetchTerms = async (params = {}) => {
  const { data } = await api.get("/glossary", { params });
  return data;
};

/**
 * Create a new glossary term
 * @param {Object} termData
 */
export const createTerm = async (termData) => {
  const { data } = await api.post("/glossary", termData);
  return data;
};

/**
 * Update an existing glossary term
 * @param {string} id
 * @param {Object} termData
 */
export const updateTerm = async (id, termData) => {
  const { data } = await api.put(`/glossary/${id}`, termData);
  return data;
};

/**
 * Delete a glossary term
 * @param {string} id
 */
export const deleteTerm = async (id) => {
  const { data } = await api.delete(`/glossary/${id}`);
  return data;
};

/**
 * Approve a pending term
 * @param {string} id
 */
export const approveTerm = async (id) => {
  const { data } = await api.post(`/glossary/${id}/approve`);
  return data;
};

/**
 * Detect terms in a given text
 * @param {string} text
 */
export const detectTerms = async (text) => {
  const { data } = await api.post("/glossary/detect", { text });
  return data;
};

/**
 * Extract terms from a meeting using AI
 * @param {string} meetingId
 */
export const extractTerms = async (meetingId) => {
  const { data } = await api.post("/glossary/extract", { meetingId });
  return data;
};
