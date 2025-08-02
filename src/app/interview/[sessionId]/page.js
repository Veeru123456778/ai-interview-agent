// src/app/interview/[sessionId]/page.js
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getSocket } from "../../lib/socketClient";

export default function InterviewPage() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [interviewStats, setInterviewStats] = useState({ current: 0, total: 8 });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const socket = getSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    
    socket.connect();
    socket.emit("joinRoom", { sessionId });

    socket.on("connect", () => {
      setConnected(true);
      console.log("Connected to server");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("Disconnected from server");
    });

    socket.on("joinedRoom", () => {
      console.log("Successfully joined room");
    });

    socket.on("agentResponse", ({ content, phase, questionCount, maxQuestions }) => {
      setMessages(prev => [...prev, { role: "assistant", content, timestamp: new Date() }]);
      setLoading(false);
      if (questionCount !== undefined) {
        setInterviewStats({ current: questionCount, total: maxQuestions });
      }
    });

    socket.on("interviewEnded", ({ reason }) => {
      setInterviewEnded(true);
      setLoading(false);
      console.log("Interview ended:", reason);
    });

    socket.on("error", ({ message }) => {
      console.error("Socket error:", message);
      setLoading(false);
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("joinedRoom");
      socket.off("agentResponse");
      socket.off("interviewEnded");
      socket.off("error");
      socket.disconnect();
    };
  }, [sessionId]);

  const startInterview = () => {
    if (!connected) return;
    setLoading(true);
    socket.emit("startInterview", { sessionId });
    setInterviewStarted(true);
  };

  const sendMessage = () => {
    if (!input.trim() || !connected || interviewEnded || loading) return;
    
    const userMessage = { role: "user", content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    socket.emit("userMessage", { sessionId, message: input });
    setInput("");
  };

  const endInterview = () => {
    if (!connected) return;
    socket.emit("endInterview", { sessionId });
    setInterviewEnded(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              AI Interview Session
            </h1>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {connected ? "Connected" : "Disconnected"}
              </span>
              {interviewStarted && !interviewEnded && (
                <span className="text-sm text-gray-600">
                  Question {interviewStats.current} of {interviewStats.total}
                </span>
              )}
            </div>
          </div>

          {!interviewStarted ? (
            <div className="text-center py-12">
              <h2 className="text-xl mb-4">Ready to begin your interview?</h2>
              <button
                onClick={startInterview}
                disabled={!connected}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Start Interview
              </button>
            </div>
          ) : (
            <>
              <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="text-left mb-4">
                    <div className="inline-block bg-gray-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {!interviewEnded ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    disabled={!connected || loading}
                    placeholder="Type your answer here..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!connected || !input.trim() || loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={endInterview}
                    disabled={!connected || loading}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    End
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">Interview completed. Thank you!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
