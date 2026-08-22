import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LiveChatWidget from "../LiveChatWidget.jsx";

const defaultProps = {
  chatMessages: [
    {
      sender: "bot",
      text: "Hello! I am the MeetOnMemory automated support bot.",
      time: "Just now",
    },
  ],
  botTyping: false,
  chatEndRef: { current: null },
  chatInput: "",
  setChatInput: vi.fn(),
  handleSendMessage: vi.fn(),
};

describe("LiveChatWidget (#1794)", () => {
  it("labels the widget as an AI/automated support bot, not live support", () => {
    render(<LiveChatWidget {...defaultProps} />);

    expect(
      screen.getByRole("region", { name: /ai support bot/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /ai support bot/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/automated assistant · not a live agent/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/live support/i)).not.toBeInTheDocument();
  });

  it("does not show an online/live-agent presence indicator", () => {
    const { container } = render(<LiveChatWidget {...defaultProps} />);

    expect(container.querySelector(".animate-ping")).toBeNull();
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
  });

  it("exposes an accessible input for messaging the automated bot", () => {
    render(<LiveChatWidget {...defaultProps} />);

    expect(
      screen.getByLabelText(/message the automated support bot/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message to the support bot/i }),
    ).toBeInTheDocument();
  });

  it("announces automated typing instead of a human agent", () => {
    render(<LiveChatWidget {...defaultProps} botTyping />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /automated assistant is typing/i,
    );
  });
});
