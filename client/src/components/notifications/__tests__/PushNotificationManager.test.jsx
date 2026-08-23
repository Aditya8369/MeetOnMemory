import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PushNotificationManager from "../PushNotificationManager.jsx";
import { notificationApi } from "../../../services/notificationApi.js";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../services/notificationApi.js", () => ({
  notificationApi: {
    getVapidPublicKey: vi.fn(),
    subscribePush: vi.fn(),
    unsubscribePush: vi.fn(),
    sendTestPush: vi.fn(),
  },
}));

describe("PushNotificationManager (#2029)", () => {
  let mockPushManager;
  let mockRegistration;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue({
        endpoint: "https://fcm.googleapis.com/fcm/send/123",
        toJSON: () => ({
          endpoint: "https://fcm.googleapis.com/fcm/send/123",
          keys: { p256dh: "key_p256dh", auth: "auth_token" },
        }),
        unsubscribe: vi.fn().mockResolvedValue(true),
      }),
    };

    mockRegistration = {
      pushManager: mockPushManager,
      showNotification: vi.fn().mockResolvedValue(undefined),
    };

    // Setup window / navigator mocks
    window.Notification = {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    };

    window.PushManager = {};

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve(mockRegistration),
      },
      writable: true,
      configurable: true,
    });
  });

  it("renders push notification manager and enables push on user action", async () => {
    notificationApi.getVapidPublicKey.mockResolvedValue({
      data: { success: true, data: { publicKey: "BHtestKey" } },
    });
    notificationApi.subscribePush.mockResolvedValue({
      data: { success: true },
    });

    render(<PushNotificationManager />);

    await waitFor(() => {
      expect(
        screen.getByText("Browser Web Push Notifications"),
      ).toBeInTheDocument();
    });

    const enableBtn = screen.getByTestId("enable-push-btn");
    expect(enableBtn).toBeInTheDocument();

    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(mockPushManager.subscribe).toHaveBeenCalled();
      expect(notificationApi.subscribePush).toHaveBeenCalled();
    });
  });

  it("renders active subscribed state with disable and send test buttons", async () => {
    window.Notification.permission = "granted";
    const existingSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/123",
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    mockPushManager.getSubscription.mockResolvedValue(existingSub);

    render(<PushNotificationManager />);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByTestId("disable-push-btn")).toBeInTheDocument();
      expect(screen.getByTestId("send-test-push-btn")).toBeInTheDocument();
    });

    // Send Test Notification
    notificationApi.sendTestPush.mockResolvedValue({
      data: {
        success: true,
        data: {
          payload: {
            title: "Test Notification",
            body: "Push test",
          },
        },
      },
    });

    fireEvent.click(screen.getByTestId("send-test-push-btn"));

    await waitFor(() => {
      expect(notificationApi.sendTestPush).toHaveBeenCalled();
    });
  });

  it("renders permission denied warning when notifications are blocked", async () => {
    window.Notification.permission = "denied";

    render(<PushNotificationManager />);

    await waitFor(() => {
      expect(screen.getByTestId("push-permission-denied")).toBeInTheDocument();
      expect(
        screen.getByText("Notification permission is blocked"),
      ).toBeInTheDocument();
    });
  });
});
