import React, { useState, useEffect, useCallback } from "react";
import { breakoutRoomApi } from "../../api/breakoutRoomApi";
import { useSocket } from "../../context/SocketContext";

const BreakoutRoomPanel = ({ meetingId, isHost, currentUserId }) => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const { socket } = useSocket();

  const fetchRooms = useCallback(async () => {
    try {
      const response = await breakoutRoomApi.getRooms(meetingId);
      if (response.success) {
        setRooms(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchRooms();

    if (socket) {
      socket.on("breakout:started", fetchRooms);
      socket.on("breakout:closed", fetchRooms);
      socket.on("breakout:user-joined", fetchRooms);
      socket.on("breakout:user-left", fetchRooms);
    }

    return () => {
      if (socket) {
        socket.off("breakout:started", fetchRooms);
        socket.off("breakout:closed", fetchRooms);
        socket.off("breakout:user-joined", fetchRooms);
        socket.off("breakout:user-left", fetchRooms);
      }
    };
  }, [socket, fetchRooms]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      await breakoutRoomApi.createRoom(meetingId, newRoomName);
      setNewRoomName("");
      fetchRooms();
    } catch (err) {
      console.error("Failed to create room", err);
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
      console.error("Failed to start room", err);
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
      console.error("Failed to close room", err);
    }
  };

  if (!isHost) {
    // Basic participant view
    const myRoom = rooms.find((r) =>
      r.participants.some((p) => p._id === currentUserId),
    );
    if (myRoom && myRoom.status === "active") {
      return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">
            Breakout Room: {myRoom.name}
          </h3>
          <p className="text-sm text-blue-600">
            You are in a breakout room. Chat and notes are now isolated.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Breakout Rooms</h2>

      <form onSubmit={handleCreateRoom} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Room Name"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create
        </button>
      </form>

      <div className="space-y-4">
        {rooms.map((room) => (
          <div key={room._id} className="border p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">
                {room.name} ({room.status})
              </h3>
              <div className="space-x-2">
                {room.status === "pending" && (
                  <button
                    onClick={() => handleStartRoom(room._id)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    Start
                  </button>
                )}
                {room.status === "active" && (
                  <button
                    onClick={() => handleCloseRoom(room._id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Participants: {room.participants.length}
            </div>
            {room.status === "closed" && room.summary && (
              <div className="mt-2 p-2 bg-gray-50 text-sm italic rounded">
                Summary: {room.summary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreakoutRoomPanel;
