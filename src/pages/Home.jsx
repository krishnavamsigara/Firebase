// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const navigate = useNavigate();

  const createRoom = () => {
    const id = uuidv4();
    navigate(`/room/${id}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    const id = e.target.roomId.value.trim();
    if (id) navigate(`/room/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      {/* Hero Image */}
      <img
        src="src\assets\image1.png"
        alt="Hero"
        className="mb-6 rounded-lg shadow-lg w-28"
      />

      {/* Heading */}
      <h1 className="text-4xl font-extrabold mb-4 text-center">
        Realtime Code Editor
      </h1>
      <p className="text-lg text-gray-400 mb-8 text-center max-w-xl">
        Collaborate in real-time with developers across the world. Create or join a coding room instantly.
      </p>

      {/* Create Room Button */}
      <button
        onClick={createRoom}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium shadow-lg mb-6"
      >
        🚀 Create Room
      </button>

      {/* Join Room Form */}
      <form onSubmit={joinRoom} className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <input
          type="text"
          name="roomId"
          placeholder="Enter Room ID"
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}
