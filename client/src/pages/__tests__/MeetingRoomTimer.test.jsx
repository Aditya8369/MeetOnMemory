import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import MeetingHeader from "../../components/meetings/MeetingHeader.jsx";
import MeetingRoom from "../MeetingRoom.jsx";
import AppContent from "../../context/AppContent.js";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: () => ({ roomId: "room-123" }),
  useNavigate: () => vi.fn(),
}));

// Mock @clerk/clerk-react
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    userId: "user-123",
  }),
}));

// Mock all WebRTC / socket hooks
vi.mock("../../hooks/useWebRTC", () => ({
  default: () => ({
    socketRef: { current: { on: vi.fn(), emit: vi.fn() } },
    userVideoRef: { current: null },
    streamRef: { current: null },
  }),
}));

vi.mock("../../hooks/useDevicePermission", () => ({
  default: () => ({ permissionGranted: true }),
}));

vi.mock("../../hooks/useLiveTranscription", () => ({
  default: () => ({
    toggleTranscription: vi.fn(),
  }),
}));

vi.mock("../../hooks/useReactions.js", () => ({
  default: () => ({
    reactions: [],
    sendReaction: vi.fn(),
    onCooldown: false,
  }),
}));

vi.mock("../../services", () => ({
  meetingApi: {
    getMeetingDetails: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components that might make network or context calls
vi.mock("../../components/meetings/CollaborativeEditor.jsx", () => ({
  default: () => <div data-testid="editor">Editor</div>,
}));

vi.mock("../../components/meetings/ParkingLotPanel.jsx", () => ({
  default: () => <div data-testid="parking-lot">Parking Lot</div>,
}));

vi.mock("../../components/meetings/TranscriptPanel.jsx", () => ({
  default: () => <div data-testid="transcript">Transcript</div>,
}));

vi.mock("../../components/meetings/LiveCaptions.jsx", () => ({
  default: () => <div data-testid="captions">Captions</div>,
}));

vi.mock("../../components/meetings/DeviceSetupModal.jsx", () => {
  const MockDeviceSetupModal = ({ onSetupComplete }) => {
    React.useEffect(() => {
      onSetupComplete();
    }, [onSetupComplete]);
    return <div data-testid="device-setup">Device Setup</div>;
  };
  return { default: MockDeviceSetupModal };
});

describe("MeetingHeader Timer Formatting (#1658)", () => {
  it("formats duration under 1 hour correctly (MM:SS)", () => {
    render(
      <MeetingHeader
        roomId="test-room"
        duration={45} // 45 seconds
        peers={[]}
        copyLink={vi.fn()}
        showNotes={false}
        setShowNotes={vi.fn()}
        transcriptionEnabled={false}
        toggleTranscription={vi.fn()}
        showTranscript={false}
        setShowTranscript={vi.fn()}
      />,
    );
    expect(screen.getByText("00:45")).toBeInTheDocument();
  });

  it("formats duration over 1 hour correctly (H:MM:SS)", () => {
    render(
      <MeetingHeader
        roomId="test-room"
        duration={3665} // 1 hour, 1 minute, 5 seconds
        peers={[]}
        copyLink={vi.fn()}
        showNotes={false}
        setShowNotes={vi.fn()}
        transcriptionEnabled={false}
        toggleTranscription={vi.fn()}
        showTranscript={false}
        setShowTranscript={vi.fn()}
      />,
    );
    expect(screen.getByText("1:01:05")).toBeInTheDocument();
  });
});
