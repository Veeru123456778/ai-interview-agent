import { graph, processUserInput } from "../lib/langgraph.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const sessions = new Map();

export default function registerInterviewEvents(io, socket) {
  socket.on("joinRoom", ({ sessionId }) => {
    socket.join(sessionId);
    console.log(`✅ User joined room: ${sessionId}`);
    
    if (!sessions.has(sessionId)) {
      // Initialize with proper default state matching StateAnnotation
      sessions.set(sessionId, {
        messages: [],
        currentQuestion: null,
        questionCount: 0,
        maxQuestions: 8,
        interviewPhase: "greeting",
        lastAnswerQuality: "none",
        candidateProfile: {},
        awaitingUserResponse: false,
        conversationStarted: false,
      });
    }
    
    io.to(sessionId).emit("joinedRoom", { sessionId });
  });

  socket.on("startInterview", async ({ sessionId }) => {
    try {
      console.log(`🎬 Starting interview for session: ${sessionId}`);
      
      let state = sessions.get(sessionId);
      if (!state) {
        state = {
          messages: [],
          currentQuestion: null,
          questionCount: 0,
          maxQuestions: 8,
          interviewPhase: "greeting",
          lastAnswerQuality: "none",
          candidateProfile: {},
          awaitingUserResponse: false,
          conversationStarted: false,
        };
        sessions.set(sessionId, state);
      }
      
      // Only start if not already started
      if (state.conversationStarted) {
        console.log(`Interview already started for session: ${sessionId}`);
        return;
      }
      
      // Start the interview graph
      const result = await graph.invoke(state);
      sessions.set(sessionId, result);
      
      // Send the greeting message to the client
      const aiMessages = result.messages.filter(msg => msg instanceof AIMessage);
      if (aiMessages.length > 0) {
        const latestMessage = aiMessages[aiMessages.length - 1];
        io.to(sessionId).emit("agentResponse", { 
          content: latestMessage.content,
          phase: result.interviewPhase,
          questionCount: result.questionCount,
          maxQuestions: result.maxQuestions
        });
      }
      
      console.log(`✅ Interview started for session: ${sessionId}, phase: ${result.interviewPhase}`);
    } catch (error) {
      console.error("Error starting interview:", error);
      io.to(sessionId).emit("error", { message: "Failed to start interview: " + error.message });
    }
  });

  socket.on("userMessage", async ({ sessionId, message }) => {
    try {
      console.log(`💬 User message in session ${sessionId}: ${message}`);
      
      let state = sessions.get(sessionId);
      if (!state) {
        io.to(sessionId).emit("error", { message: "Session not found. Please start the interview first." });
        return;
      }
      
      // Check if we're already processing or waiting for response
      if (!state.conversationStarted) {
        io.to(sessionId).emit("error", { message: "Please start the interview first." });
        return;
      }
      
      // Process user input through the graph
      const previousMessageCount = state.messages.length;
      const newState = await processUserInput(state, message);
      sessions.set(sessionId, newState);
      
      // Find new AI messages that were added
      const newMessages = newState.messages.slice(previousMessageCount + 1); // +1 to skip the user message we just added
      const newAIMessages = newMessages.filter(msg => msg instanceof AIMessage);
      
      // Send each new AI response
      for (const aiMsg of newAIMessages) {
        io.to(sessionId).emit("agentResponse", { 
          content: aiMsg.content,
          phase: newState.interviewPhase,
          questionCount: newState.questionCount,
          maxQuestions: newState.maxQuestions
        });
      }
      
      // Check if interview naturally ended
      if (newState.interviewPhase === "ended" && !newState.awaitingUserResponse) {
        io.to(sessionId).emit("interviewEnded", { 
          totalQuestions: newState.questionCount,
          reason: "Interview completed naturally"
        });
      }
      
      console.log(`✅ Processed message for session: ${sessionId}, phase: ${newState.interviewPhase}, awaiting: ${newState.awaitingUserResponse}`);
      
    } catch (error) {
      console.error("Error processing message:", error);
      io.to(sessionId).emit("error", { message: "Failed to process message: " + error.message });
    }
  });

  socket.on("endInterview", async ({ sessionId }) => {
    try {
      console.log(`🔚 Ending interview for session: ${sessionId}`);
      
      const state = sessions.get(sessionId);
      if (state) {
        // Send a polite closing message
        io.to(sessionId).emit("agentResponse", { 
          content: "Thank you for your time today. The interview has been ended. Have a great day!",
          phase: "ended",
          questionCount: state.questionCount,
          maxQuestions: state.maxQuestions
        });
      }
      
      sessions.delete(sessionId);
      io.to(sessionId).emit("interviewEnded", { 
        reason: "User ended interview",
        totalQuestions: state?.questionCount || 0
      });
    } catch (error) {
      console.error("Error ending interview:", error);
      sessions.delete(sessionId);
      io.to(sessionId).emit("interviewEnded", { reason: "Error occurred" });
    }
  });

  socket.on("disconnect", () => {
    console.log("👋 User disconnected");
    // Note: We keep the session data in case they reconnect
    // Sessions will be cleaned up by a separate cleanup process if needed
  });
}