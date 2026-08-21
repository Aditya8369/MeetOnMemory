import React, { useState, useEffect, useCallback } from "react";
import { breakoutRoomApi } from "../../services/breakoutRoomApi.js";
import { useSocket } from "../../context/SocketContext";

const BreakoutRoomPanel = ({ meetingId, isHost, currentUserId }) => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  const fetchRooms = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoading(true);
      const response = await breakoutRoomApi.getRooms(meetingId);
      if (response.success && Array.isArray(response.data)) {
        setRooms(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch breakout rooms", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchRooms();

    if (socket) {
      socket.on("breakout:created", fetchRooms);
      socket.on("breakout:started", fetchRooms);
      socket.on("breakout:closed", fetchRooms);
      socket.on("breakout:user-joined", fetchRooms);
      socket.on("breakout:user-left", fetchRooms);
      socket.on("breakout:timer-sync", fetchRooms);
    }

    return () => {
      if (socket) {
        socket.off("breakout:created", fetchRooms);
        socket.off("breakout:started", fetchRooms);
        socket.off("breakout:closed", fetchRooms);
        socket.off("breakout:user-joined", fetchRooms);
        socket.off("breakout:user-left", fetchRooms);
        socket.off("breakout:timer-sync", fetchRooms);
      }
    };
  }, [socket, fetchRooms]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      await breakoutRoomApi.createRoom(meetingId, newRoomName.trim());
      setNewRoomName("");
      if (socket) {
        socket.emit("breakout:created", { roomId: meetingId });
      }
      fetchRooms();
    } catch (err) {
      console.error("Failed to create breakout room", err);
    }
  };

  const handleStartRoom = async (roomId) => {
    try {
      await breakoutRoomApi.startRoom(meetingId, roomId);
      if (socket) {
        socket.emit("breakout:started", {
          roomId: meetingId,
          breakoutRoomId: roomId,
        });
      }
      fetchRooms();
    } catch (err) {
      console.error("Failed to start breakout room", err);
    }
  };

  const handleCloseRoom = async (roomId) => {
    try {
      await breakoutRoomApi.closeRoom(meetingId, roomId);
      if (socket) {
        socket.emit("breakout:closed", {
          roomId: meetingId,
          breakoutRoomId: roomId,
        });
      }
      fetchRooms();
    } catch (err) {
      console.error("Failed to close breakout room", err);
    }
  };

  if (!isHost) {
    const myRoom = rooms.find((r) =>
      r.participants?.some(
        (p) => (p._id || p.id || p) === currentUserId?.toString(),
      ),
    );
    if (myRoom && myRoom.status === "active") {
      return (
        <div className="p-4 bg-indigo-950/60 border border-indigo-800 rounded-lg text-white">
          <h3 className="text-lg font-semibold text-indigo-300">
            Breakout Room: {myRoom.name}
          </h3>
          <p className="text-xs text-indigo-200 mt-1">
            You are currently in an active breakout room. Audio & notes are
            isolated to your room group.
          </p>
        </div>
      );
    }
    return (
      <div className="p-4 bg-gray-900 text-gray-400 text-sm text-center">
        No active breakout room assigned.
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-950 text-white flex flex-col h-full overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 text-gray-100 flex items-center justify-between">
        <span>Breakout Rooms</span>
        {loading && (
          <span className="text-xs text-gray-400 font-normal">Syncing...</span>
        )}
      </h2>

      <form onSubmit={handleCreateRoom} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Room Name"
          className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors cursor-pointer"
        >
          Create
        </button>
      </form>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {rooms.map((room) => (
          <div
            key={room._id}
            className="border border-gray-800 p-3 rounded-lg bg-gray-900/60"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm text-gray-200">
                {room.name}{" "}
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                  {room.status}
                </span>
              </h3>
              <div className="space-x-2">
                {room.status === "pending" && (
                  <button
                    onClick={() => handleStartRoom(room._id)}
                    className="px-2.5 py-1 bg-green-900/60 text-green-300 hover:bg-green-800 rounded text-xs font-semibold cursor-pointer"
                  >
                    Start
                  </button>
                )}
                {room.status === "active" && (
                  <button
                    onClick={() => handleCloseRoom(room._id)}
                    className="px-2.5 py-1 bg-red-900/60 text-red-300 hover:bg-red-800 rounded text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Participants: {room.participants?.length || 0}
            </div>
            {room.status === "closed" && room.summary && (
              <div className="mt-2 p-2 bg-gray-950 text-xs italic text-gray-300 rounded border border-gray-850">
                Summary: {room.summary}
              </div>
            )}
          </div>
        ))}
        {rooms.length === 0 && !loading && (
          <div className="text-center py-8 text-xs text-gray-500">
            No breakout rooms created yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default BreakoutRoomPanel;
