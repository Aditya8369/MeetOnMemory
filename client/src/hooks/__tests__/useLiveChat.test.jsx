import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import useLiveChat from "../useLiveChat";

const submit = (result, text) => {
  act(() => {
    result.current.setChatInput(text);
  });
  act(() => {
    result.current.handleSendMessage({ preventDefault: vi.fn() });
  });
};

describe("useLiveChat (#1794)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens with an automated-bot greeting, not a live-agent claim", () => {
    const { result } = renderHook(() => useLiveChat());
    const greeting = result.current.chatMessages[0];

    expect(greeting.sender).toBe("bot");
    expect(greeting.text).toMatch(/automated support bot/i);
    expect(greeting.text).toMatch(/not a live agent/i);
    expect(greeting.text).not.toMatch(/live support/i);
  });

  it("does not claim an unmonitored chat will be read by the support team", () => {
    const { result } = renderHook(() => useLiveChat());

    submit(result, "Can someone review my account?");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const reply = result.current.chatMessages.at(-1);
    expect(reply.sender).toBe("bot");
    expect(reply.text).toMatch(/automated assistant/i);
    expect(reply.text).toMatch(/not monitored by a person/i);
    expect(reply.text).toMatch(/contact form/i);
    expect(reply.text).not.toMatch(/our team will read this/i);
  });

  it("keeps keyword replies for common support questions", () => {
    const { result } = renderHook(() => useLiveChat());

    submit(result, "What is your pricing plan?");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.chatMessages.at(-1).text).toMatch(/billing/i);
    expect(result.current.botTyping).toBe(false);
  });
});
