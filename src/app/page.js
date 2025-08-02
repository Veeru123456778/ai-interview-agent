// "use client";
// import { useEffect, useState } from "react";
// import { io } from "socket.io-client";

// let socket;

// export default function InterviewPage() {
//   const [isClient, setIsClient] = useState(false);
//   const [roomId, setRoomId] = useState(null);
//   const [candidateName, setCandidateName] = useState("John Doe");
//   const [jobRole, setJobRole] = useState("Frontend Developer");
//   const [experienceLevel, setExperienceLevel] = useState("Mid-level");
//   const [questions, setQuestions] = useState([]);
//   const [answer, setAnswer] = useState("");
//   const [isConnected, setIsConnected] = useState(false);

//   useEffect(() => {
//     setIsClient(true); // Ensures rendering happens after hydration
//   }, []);

//   useEffect(() => {
//     if (!isClient) return;

//     socket = io("http://localhost:4000");

//     socket.on("connect", () => {
//       console.log("✅ Connected to Socket.IO server");
//       setIsConnected(true);
//     });

//     socket.on("joined_room", (data) => console.log(data.message));

//     socket.on("ai_response", (data) => {
//       setQuestions((prev) => [...prev, data.question]);
//     });

//     socket.on("error_message", (data) => {
//       console.error("Error:", data.error);
//     });

//     socket.on("disconnect", () => {
//       console.log("❌ Disconnected from server");
//       setIsConnected(false);
//     });

//     setRoomId("room-" + Math.floor(Math.random() * 100000));

//     return () => {
//       socket.disconnect();
//     };
//   }, [isClient]);

//   if (!isClient) {
//     return <div className="p-6">Loading interview UI...</div>;
//   }

//   const joinRoom = () => {
//     if (!roomId) return;
//     socket.emit("join_room", { roomId, candidateName });
//   };

//   const startInterview = () => {
//     if (!roomId) return;
//     socket.emit("start_interview", { roomId, candidateName, jobRole, experienceLevel });
//   };

//   const sendAnswer = () => {
//     if (!answer.trim() || !roomId) return;
//     socket.emit("user_answer", { roomId, answer });
//     setAnswer("");
//   };

//   return (
//     <div className="p-6 max-w-xl mx-auto">
//       <h1 className="text-2xl font-bold mb-4">AI Interview Agent</h1>

//       <p className="mb-4 text-gray-600">
//         Connection: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
//       </p>

//       <div className="flex gap-2 mb-4">
//         <button
//           onClick={joinRoom}
//           className="bg-blue-500 text-white px-4 py-2 rounded"
//           disabled={!isConnected}
//         >
//           Join Room
//         </button>
//         <button
//           onClick={startInterview}
//           className="bg-green-500 text-white px-4 py-2 rounded"
//           disabled={!isConnected}
//         >
//           Start Interview
//         </button>
//       </div>

//       <div className="border rounded p-4 mb-4 h-64 overflow-y-auto">
//         {questions.map((q, i) => (
//           <p key={i} className="mb-2">Q{i + 1}: {q}</p>
//         ))}
//       </div>

//       <div className="flex gap-2">
//         <input
//           type="text"
//           value={answer}
//           onChange={(e) => setAnswer(e.target.value)}
//           placeholder="Type your answer..."
//           className="border p-2 rounded w-full"
//           disabled={!isConnected}
//         />
//         <button
//           onClick={sendAnswer}
//           className="bg-purple-500 text-white px-4 py-2 rounded"
//           disabled={!isConnected}
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [sessionInput, setSessionInput] = useState("");

  const startNewInterview = () => {
    const newSessionId = crypto.randomUUID();
    router.push(`/interview/${newSessionId}`);
  };

  const joinInterview = () => {
    if (sessionInput.trim()) {
      router.push(`/interview/${sessionInput.trim()}`);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Welcome to AI Interview Platform</h1>

      <button onClick={startNewInterview}>Start New Interview</button>

      <div style={{ marginTop: "1rem" }}>
        <input
          type="text"
          placeholder="Enter Session ID to join"
          value={sessionInput}
          onChange={(e) => setSessionInput(e.target.value)}
        />
        <button onClick={joinInterview} disabled={!sessionInput.trim()}>
          Join Interview
        </button>
      </div>
    </div>
  );
}
