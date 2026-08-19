import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import useContactForm from "../useContactForm";
import { submitContactForm } from "../../services/contactApi";

vi.mock("../../services/contactApi", () => ({
  submitContactForm: vi.fn(),
}));

const validForm = {
  name: "Jane Doe",
  email: "jane@example.com",
  org: "Acme",
  subject: "Need help",
  department: "support",
  message: "My transcripts are missing.",
};

const fakeEvent = { preventDefault: vi.fn() };

describe("useContactForm (#1793)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits successfully and receives a real ticket ID from the backend", async () => {
    submitContactForm.mockResolvedValueOnce({
      data: {
        success: true,
        ticketId: "MOM-654321",
        department: "support",
        sla: "Within 12 hours",
        status: "Open / Queued",
      },
    });

    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setFormData(validForm);
    });

    await act(async () => {
      await result.current.handleFormSubmit(fakeEvent);
    });

    expect(result.current.submittedTicket).toEqual(
      expect.objectContaining({
        id: "MOM-654321",
        department: "support",
        sla: "Within 12 hours",
        status: "Open / Queued",
      }),
    );
    expect(result.current.submitError).toBe("");
    expect(result.current.submitting).toBe(false);
    expect(result.current.formData.name).toBe("");
  });

  it("does not fabricate a ticket ID — ID comes only from backend response", async () => {
    submitContactForm.mockResolvedValueOnce({
      data: {
        success: true,
        ticketId: "MOM-BACKEND-42",
        department: "sales",
        sla: "Within 4 hours",
        status: "Open / Queued",
      },
    });

    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setFormData(validForm);
    });

    await act(async () => {
      await result.current.handleFormSubmit(fakeEvent);
    });

    expect(result.current.submittedTicket.id).toBe("MOM-BACKEND-42");
    expect(submitContactForm).toHaveBeenCalledTimes(1);
  });

  it("shows an error and clears loading state on API failure", async () => {
    submitContactForm.mockRejectedValueOnce({
      response: { data: { message: "Server unavailable." }, status: 503 },
      message: "Server unavailable.",
    });

    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setFormData(validForm);
    });

    await act(async () => {
      await result.current.handleFormSubmit(fakeEvent);
    });

    expect(result.current.submittedTicket).toBeNull();
    expect(result.current.submitError).toBe("Server unavailable.");
    expect(result.current.submitting).toBe(false);
  });

  it("shows validation errors from the backend", async () => {
    submitContactForm.mockRejectedValueOnce({
      response: {
        data: { message: "Please provide a valid email address." },
        status: 400,
      },
      message: "Please provide a valid email address.",
    });

    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setFormData(validForm);
    });

    await act(async () => {
      await result.current.handleFormSubmit(fakeEvent);
    });

    expect(result.current.submitError).toBe(
      "Please provide a valid email address.",
    );
    expect(result.current.submittedTicket).toBeNull();
  });

  it("prevents duplicate submissions while a request is pending", async () => {
    let resolveSubmit;
    submitContactForm.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setFormData(validForm);
    });

    act(() => {
      result.current.handleFormSubmit(fakeEvent);
    });

    expect(result.current.submitting).toBe(true);

    act(() => {
      result.current.handleFormSubmit(fakeEvent);
    });

    expect(submitContactForm).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({
        data: {
          success: true,
          ticketId: "MOM-999999",
          department: "support",
          sla: "Within 12 hours",
          status: "Open / Queued",
        },
      });
    });

    expect(result.current.submitting).toBe(false);
  });

  it("sets loading state during submission", async () => {
    let resolveSubmit;
    submitContactForm.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    const { result } = renderHook(() => useContactForm());

    act(() => {
      result.current.setFormData(validForm);
    });

    act(() => {
      result.current.handleFormSubmit(fakeEvent);
    });

    expect(result.current.submitting).toBe(true);

    await act(async () => {
      resolveSubmit({
        data: {
          success: true,
          ticketId: "MOM-222222",
          department: "support",
          sla: "Within 12 hours",
          status: "Open / Queued",
        },
      });
    });

    expect(result.current.submitting).toBe(false);
  });
});
