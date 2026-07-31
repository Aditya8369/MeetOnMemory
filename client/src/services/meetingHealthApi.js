import axios from "axios";

// If you have a configured axios instance, import it instead
// import api from "./api"; // Example

const getMeetingHealth = async (meetingId) => {
  const token = localStorage.getItem("token");
  const response = await axios.get(`/api/meeting-health/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getOrganizationHealthTrends = async (organizationId) => {
  const token = localStorage.getItem("token");
  const response = await axios.get(
    `/api/meeting-health/trends/${organizationId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};

export const meetingHealthApi = {
  getMeetingHealth,
  getOrganizationHealthTrends,
};
