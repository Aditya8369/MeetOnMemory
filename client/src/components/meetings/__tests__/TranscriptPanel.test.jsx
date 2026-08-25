import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TranscriptPanel from "../TranscriptPanel.jsx";

vi.mock("../../meeting-room/MultiLanguageTranscript.jsx", () => ({
  default: ({ meetingId }) => (
    <div data-testid="multilang-transcript-component">
      MultiLanguageTranscript for {meetingId}
    </div>
  ),
}));

describe("TranscriptPanel Component (#1880)", () => {
  const defaultProps = {
    showTranscript: true,
    onClose: vi.fn(),
    meetingId: "room-abc",
    transcriptSegments: [
      {
        speaker: "Alice",
        startTime: 125,
        text: "Let's review the roadmap.",
      },
    ],
  };

  it("does not render when showTranscript is false", () => {
    const { container } = render(
      <TranscriptPanel {...defaultProps} showTranscript={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders MultiLanguageTranscript in default translations tab", () => {
    render(<TranscriptPanel {...defaultProps} />);

    expect(
      screen.getByTestId("meeting-room-transcript-panel"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("multilang-transcript-component"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("MultiLanguageTranscript for room-abc"),
    ).toBeInTheDocument();
  });

  it("switches to raw stream view and back", () => {
    render(<TranscriptPanel {...defaultProps} />);

    const rawBtn = screen.getByRole("button", { name: /raw stream/i });
    fireEvent.click(rawBtn);

    expect(
      screen.queryByTestId("multilang-transcript-component"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Let's review the roadmap.")).toBeInTheDocument();
    expect(screen.getByText("02:05")).toBeInTheDocument();

    const translationsBtn = screen.getByRole("button", {
      name: /translations/i,
    });
    fireEvent.click(translationsBtn);

    expect(
      screen.getByTestId("multilang-transcript-component"),
    ).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<TranscriptPanel {...defaultProps} onClose={onClose} />);

    fireEvent.click(
      screen.getByRole("button", { name: /close transcript panel/i }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores active tab from localStorage on mount", () => {
    localStorage.setItem("transcriptPanelActiveTab-room-abc", "raw");
    render(<TranscriptPanel {...defaultProps} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(
      screen.queryByTestId("multilang-transcript-component"),
    ).not.toBeInTheDocument();
  });
});
