import { useState } from "react";
import { submitContactForm } from "../services/contactApi";

export default function useContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    org: "",
    subject: "",
    department: "support",
    message: "",
  });
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await submitContactForm({
        name: formData.name,
        email: formData.email,
        organization: formData.org,
        department: formData.department,
        subject: formData.subject,
        message: formData.message,
      });

      const data = response.data;

      setSubmittedTicket({
        id: data.ticketId,
        name: formData.name,
        email: formData.email,
        department: data.department,
        subject: formData.subject,
        date: new Date().toLocaleString(),
        status: data.status || "Open / Queued",
        sla: data.sla,
      });

      setFormData({
        name: "",
        email: "",
        org: "",
        subject: "",
        department: "support",
        message: "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to submit your request. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    submittedTicket,
    setSubmittedTicket,
    submitting,
    submitError,
    handleFormSubmit,
  };
}
