import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MeetingRoom from "../MeetingRoom.jsx";
import AppContent from "../../context/AppContent.js";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ roomId: "room-panel-123" }),
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
  default: () => <div data-testid="parking-lot-content">Parking Lot Panel</div>,
}));

vi.mock("../../components/meetings/LiveCaptions.jsx", () => ({
  default: () => <div data-testid="captions">Captions</div>,
}));

describe("MeetingRoom exclusive panel state (#1648)", () => {
  const wrapper = ({ children }) => (
    <AppContent.Provider
      value={{
        userData: { _id: "mongo_user_1", name: "Alice" },
      }}
    >
      {children}
    </AppContent.Provider>
  );

  const joinMeeting = async () => {
    fireEvent.click(screen.getByRole("button", { name: /mock join button/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("banner", { name: /meeting room header/i }),
      ).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens Notes from the initial state", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    fireEvent.click(screen.getByRole("button", { name: /^notes$/i }));

    expect(screen.getByTestId("meeting-room-notes-panel")).toBeInTheDocument();
    expect(
      screen.queryByTestId("meeting-room-parking-lot-panel"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("meeting-room-transcript-panel"),
    ).not.toBeInTheDocument();
  });

  it("switches from Notes to Parking Lot exclusively", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    fireEvent.click(screen.getByRole("button", { name: /^notes$/i }));
    expect(screen.getByTestId("meeting-room-notes-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /parking lot/i }));

    expect(
      screen.getByTestId("meeting-room-parking-lot-panel"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("meeting-room-notes-panel"),
    ).not.toBeInTheDocument();
  });

  it("switches from Parking Lot to Transcript exclusively", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    fireEvent.click(screen.getByRole("button", { name: /parking lot/i }));
    expect(
      screen.getByTestId("meeting-room-parking-lot-panel"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /transcript/i }));

    expect(
      screen.getByTestId("meeting-room-transcript-panel"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("meeting-room-parking-lot-panel"),
    ).not.toBeInTheDocument();
  });

  it("switches from Transcript back to Notes exclusively", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    fireEvent.click(screen.getByRole("button", { name: /transcript/i }));
    expect(
      screen.getByTestId("meeting-room-transcript-panel"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^notes$/i }));

    expect(screen.getByTestId("meeting-room-notes-panel")).toBeInTheDocument();
    expect(
      screen.queryByTestId("meeting-room-transcript-panel"),
    ).not.toBeInTheDocument();
  });

  it("closes the active panel when its header toggle is clicked again", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    const notesButton = screen.getByRole("button", { name: /^notes$/i });
    fireEvent.click(notesButton);
    expect(screen.getByTestId("meeting-room-notes-panel")).toBeInTheDocument();

    fireEvent.click(notesButton);
    expect(
      screen.queryByTestId("meeting-room-notes-panel"),
    ).not.toBeInTheDocument();
  });

  it("closes the transcript panel from its close control", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    fireEvent.click(screen.getByRole("button", { name: /transcript/i }));
    expect(
      screen.getByTestId("meeting-room-transcript-panel"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /close transcript panel/i }),
    );

    expect(
      screen.queryByTestId("meeting-room-transcript-panel"),
    ).not.toBeInTheDocument();
  });

  it("never renders more than one side panel at a time", async () => {
    render(<MeetingRoom />, { wrapper });
    await joinMeeting();

    fireEvent.click(screen.getByRole("button", { name: /^notes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /parking lot/i }));
    fireEvent.click(screen.getByRole("button", { name: /transcript/i }));

    const visiblePanels = [
      screen.queryByTestId("meeting-room-notes-panel"),
      screen.queryByTestId("meeting-room-parking-lot-panel"),
      screen.queryByTestId("meeting-room-transcript-panel"),
    ].filter(Boolean);

    expect(visiblePanels).toHaveLength(1);
    expect(
      screen.getByTestId("meeting-room-transcript-panel"),
    ).toBeInTheDocument();
  });
});
