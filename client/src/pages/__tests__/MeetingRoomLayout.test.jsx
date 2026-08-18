import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MeetingRoom from "../MeetingRoom.jsx";
import AppContent from "../../context/AppContent.js";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ roomId: "room-layout-123" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    userId: "user_1",
  }),
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    id: "socket_1",
    auth: {},
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("../../services/apiClient.js", () => ({
  createClerkSocketOptions: vi.fn(async () => ({
    auth: { token: "token_1" },
    transports: ["websocket"],
  })),
  getClerkBearerToken: vi.fn(async () => "token_1"),
}));

vi.mock("../../hooks/useDevicePermission", () => ({
  default: () => ({
    selectedCamera: "cam-1",
    selectedMicrophone: "mic-1",
    releaseStream: vi.fn(),
  }),
}));

vi.mock("../../hooks/useWebRTC", () => ({
  default: () => ({
    socketRef: { current: { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() } },
    userVideoRef: { current: null },
    streamRef: { current: null },
  }),
}));

vi.mock("../../hooks/useLiveTranscription", () => ({
  default: () => ({
    toggleTranscription: vi.fn(),
  }),
}));

vi.mock("../../hooks/useReactions", () => ({
  default: () => ({
    reactions: [],
    sendReaction: vi.fn(),
    onCooldown: false,
  }),
}));

vi.mock("../../utils/mediaStream", () => ({
  resolveMeetingMediaStream: vi.fn().mockResolvedValue({
    getTracks: () => [],
    getAudioTracks: () => [],
    getVideoTracks: () => [],
  }),
  getTrackEnabledState: vi
    .fn()
    .mockReturnValue({ micOn: true, cameraOn: true }),
}));

vi.mock("../../components/meetings/DeviceSetupModal.jsx", () => ({
  default: ({ onJoin }) => (
    <div data-testid="device-setup">
      <button type="button" onClick={() => onJoin(null)}>
        Mock Join Button
      </button>
    </div>
  ),
}));

vi.mock("../../components/meetings/CollaborativeEditor.jsx", () => ({
  default: () => <div data-testid="editor">Editor</div>,
}));

vi.mock("../../components/meetings/ParkingLotPanel.jsx", () => ({
  default: () => <div data-testid="parking-lot">Parking Lot Panel</div>,
}));

vi.mock("../../components/meetings/TranscriptPanel.jsx", () => ({
  default: ({ showTranscript }) =>
    showTranscript ? (
      <div data-testid="meeting-room-transcript-panel">Transcript Panel</div>
    ) : null,
}));

vi.mock("../../components/meetings/LiveCaptions.jsx", () => ({
  default: () => <div data-testid="captions">Captions</div>,
}));

describe("MeetingRoom layout (#1647)", () => {
  const wrapper = ({ children }) => (
    <AppContent.Provider
      value={{
        userData: { _id: "mongo_user_1", name: "Alice" },
      }}
    >
      {children}
    </AppContent.Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the device setup screen before joining", () => {
    render(<MeetingRoom />, { wrapper });

    expect(screen.getByTestId("device-setup")).toBeInTheDocument();
    expect(
      screen.queryByRole("banner", { name: /meeting room header/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a single live meeting header after joining", async () => {
    render(<MeetingRoom />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /mock join button/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("banner", { name: /meeting room header/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getAllByRole("banner", { name: /meeting room header/i }),
    ).toHaveLength(1);
    expect(screen.getAllByText(/Room: room-layout-123/i)).toHaveLength(1);
  });

  it("keeps live meeting controls available after joining", async () => {
    render(<MeetingRoom />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /mock join button/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /copy link/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /^notes$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /parking lot/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /captions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /transcript/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leave/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /mute microphone/i }),
    ).toBeInTheDocument();
  });

  it("does not render the marketing footer inside MeetingRoom", async () => {
    render(<MeetingRoom />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /mock join button/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("banner", { name: /meeting room header/i }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
