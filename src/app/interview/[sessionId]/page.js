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
  const [currentPhase, setCurrentPhase] = useState("greeting");
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
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content, 
        timestamp: new Date(),
        phase: phase || "unknown"
      }]);
      setLoading(false);
      setCurrentPhase(phase || "unknown");
      if (questionCount !== undefined && maxQuestions !== undefined) {
        setInterviewStats({ current: questionCount, total: maxQuestions });
      }
    });

    socket.on("interviewEnded", ({ reason, totalQuestions }) => {
      setInterviewEnded(true);
      setLoading(false);
      console.log("Interview ended:", reason);
      if (reason !== "User ended interview") {
        setMessages(prev => [...prev, { 
          role: "system", 
          content: `Interview completed. Total questions asked: ${totalQuestions || 0}`, 
          timestamp: new Date() 
        }]);
      }
    });

    socket.on("error", ({ message }) => {
      console.error("Socket error:", message);
      setLoading(false);
      setMessages(prev => [...prev, { 
        role: "error", 
        content: `Error: ${message}`, 
        timestamp: new Date() 
      }]);
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

  const getPhaseDisplayName = (phase) => {
    const phaseNames = {
      greeting: "Getting Started",
      introduction: "Introduction",
      technical: "Technical Questions",
      behavioral: "Behavioral Questions", 
      closing: "Closing",
      ended: "Completed"
    };
    return phaseNames[phase] || phase;
  };

  const getPhaseColor = (phase) => {
    const colors = {
      greeting: "bg-blue-100 text-blue-800",
      introduction: "bg-green-100 text-green-800",
      technical: "bg-purple-100 text-purple-800",
      behavioral: "bg-orange-100 text-orange-800",
      closing: "bg-yellow-100 text-yellow-800",
      ended: "bg-gray-100 text-gray-800"
    };
    return colors[phase] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                AI Interview Session
              </h1>
              {interviewStarted && (
                <p className="text-gray-600">
                  Session ID: <span className="font-mono text-sm">{sessionId}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {connected ? "🟢 Connected" : "🔴 Disconnected"}
              </span>
              {interviewStarted && !interviewEnded && (
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(currentPhase)}`}>
                    {getPhaseDisplayName(currentPhase)}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Question {interviewStats.current} of {interviewStats.total}
                  </p>
                </div>
              )}
            </div>
          </div>

          {!interviewStarted ? (
            <div className="text-center py-16">
              <div className="mb-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎯</span>
                </div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">Ready to begin your interview?</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  This AI-powered interview will assess your technical skills, experience, and fit for the role. 
                  The conversation will be natural and adaptive to your responses.
                </p>
              </div>
              <button
                onClick={startInterview}
                disabled={!connected || loading}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                {loading ? "Starting..." : "Start Interview"}
              </button>
            </div>
          ) : (
            <>
              <div className="border rounded-xl p-6 h-96 overflow-y-auto mb-6 bg-gray-50 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : msg.role === "error"
                          ? "bg-red-100 border border-red-200 text-red-800"
                          : msg.role === "system"
                          ? "bg-yellow-100 border border-yellow-200 text-yellow-800"
                          : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <span className="text-sm text-gray-600 ml-2">Interviewer is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {!interviewEnded ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      disabled={!connected || loading}
                      placeholder="Type your answer here..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!connected || !input.trim() || loading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Send
                    </button>
                    <button
                      onClick={endInterview}
                      disabled={!connected || loading}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      End
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    Press Enter to send your response
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Interview Completed!</h3>
                  <p className="text-gray-600">Thank you for your time. We'll be in touch soon.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
