import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
dotenv.config();

// Initialize the model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

// Define the state interface
const StateAnnotation = {
  messages: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  currentQuestion: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  questionCount: {
    value: (x, y) => y ?? x,
    default: () => 0,
  },
  maxQuestions: {
    value: (x, y) => y ?? x,
    default: () => 8,
  },
  interviewPhase: {
    value: (x, y) => y ?? x,
    default: () => "greeting",
  },
  lastAnswerQuality: {
    value: (x, y) => y ?? x,
    default: () => "none",
  },
  candidateProfile: {
    value: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  },
  awaitingUserResponse: {
    value: (x, y) => y ?? x,
    default: () => false,
  },
  conversationStarted: {
    value: (x, y) => y ?? x,
    default: () => false,
  },
};

// Node functions
async function greetAndAskIntroduction(state) {
  const greetingMessage = `Hello! Welcome to the interview. I'm excited to learn more about you and your background. 

Let's start with a brief introduction. Could you please tell me about yourself, including your professional background and what brings you here today?`;

  return {
    messages: [new AIMessage(greetingMessage)],
    currentQuestion: "Tell me about yourself",
    interviewPhase: "introduction",
    awaitingUserResponse: true,
    conversationStarted: true,
  };
}

async function analyzeAnswer(state) {
  const messages = state.messages || [];
  const lastUserMessage = messages[messages.length - 1];
  
  if (!lastUserMessage || !(lastUserMessage instanceof HumanMessage)) {
    return { awaitingUserResponse: true };
  }

  const analysisPrompt = `You are an expert interviewer. Analyze this candidate's answer and determine:
1. Quality: Is it comprehensive (good), needs more detail (needs_clarification), or completely insufficient (insufficient)?
2. Key points mentioned that are relevant
3. Whether a follow-up question would help get better information

Current Question: "${state.currentQuestion}"
Candidate's Answer: "${lastUserMessage.content}"
Interview Phase: ${state.interviewPhase}

Respond in this exact format:
QUALITY: [good/needs_clarification/insufficient]
KEY_POINTS: [comma-separated list of relevant points mentioned]
FOLLOW_UP_NEEDED: [yes/no]
REASON: [brief explanation of your assessment]`;

  try {
    const analysis = await model.invoke([new SystemMessage(analysisPrompt)]);
    const analysisText = analysis.content.toLowerCase();
    
    let quality = "good";
    if (analysisText.includes("quality: needs_clarification") || analysisText.includes("needs_clarification")) {
      quality = "needs_clarification";
    } else if (analysisText.includes("quality: insufficient") || analysisText.includes("insufficient")) {
      quality = "insufficient";
    }

    // Extract candidate info from introduction
    let updatedProfile = {};
    if (state.interviewPhase === "introduction") {
      const answer = lastUserMessage.content;
      // Extract experience
      const experienceMatch = answer.match(/(\d+)\s*(?:years?|yrs?)/i);
      if (experienceMatch) {
        updatedProfile.experience = `${experienceMatch[1]} years`;
      }
      
      // Extract name
      const nameMatch = answer.match(/(?:name is|i'm|i am|call me)\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        updatedProfile.name = nameMatch[1];
      }
      
      // Extract role/position mentions
      const roleKeywords = ['developer', 'engineer', 'programmer', 'designer', 'manager', 'analyst'];
      for (const keyword of roleKeywords) {
        if (answer.toLowerCase().includes(keyword)) {
          updatedProfile.role = updatedProfile.role || [];
          if (!updatedProfile.role.includes(keyword)) {
            updatedProfile.role.push(keyword);
          }
        }
      }
    }

    return {
      lastAnswerQuality: quality,
      candidateProfile: updatedProfile,
      awaitingUserResponse: false,
    };
  } catch (error) {
    console.error("Error in analyzeAnswer:", error);
    return {
      lastAnswerQuality: "good", // Default to good to continue flow
      awaitingUserResponse: false,
    };
  }
}

async function generateFollowUp(state) {
  const messages = state.messages || [];
  let lastUserMessage = null;
  
  // Find the last human message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] instanceof HumanMessage) {
      lastUserMessage = messages[i];
      break;
    }
  }
  
  if (!lastUserMessage) {
    return { awaitingUserResponse: true };
  }
  
  const followUpPrompt = `As a professional interviewer, the candidate's previous answer needs clarification or more detail. 

Current Question: "${state.currentQuestion}"
Candidate's Answer: "${lastUserMessage.content}"
Interview Phase: ${state.interviewPhase}

Generate a natural, encouraging follow-up question that:
1. Acknowledges what they said
2. Asks for more specific details or examples
3. Keeps the conversation flowing naturally
4. Is supportive and not intimidating

Make it conversational and human-like, as if you're genuinely interested in learning more.`;

  try {
    const response = await model.invoke([new SystemMessage(followUpPrompt)]);

    return {
      messages: [new AIMessage(response.content)],
      awaitingUserResponse: true,
      // Keep the same current question since this is a follow-up
    };
  } catch (error) {
    console.error("Error in generateFollowUp:", error);
    return {
      messages: [new AIMessage("Could you tell me a bit more about that? I'd love to hear more details.")],
      awaitingUserResponse: true,
    };
  }
}

async function generateNextQuestion(state) {
  const { questionCount, maxQuestions, interviewPhase, messages, candidateProfile } = state;
  
  // Determine next phase based on question count and current phase
  let nextPhase = interviewPhase;
  if (interviewPhase === "introduction" && questionCount >= 1) {
    nextPhase = "technical";
  } else if (interviewPhase === "technical" && questionCount >= 4) {
    nextPhase = "behavioral";
  } else if (interviewPhase === "behavioral" && questionCount >= 6) {
    nextPhase = "closing";
  }

  // Build conversation context for more natural questions
  const recentMessages = (messages || []).slice(-4).map(m => {
    const role = m instanceof HumanMessage ? 'Candidate' : 'Interviewer';
    return `${role}: ${m.content}`;
  }).join('\n');

  const candidateInfo = Object.keys(candidateProfile).length > 0 
    ? `\nCandidate info gathered: ${JSON.stringify(candidateProfile)}` 
    : '';

  const phasePrompts = {
    technical: `Generate a technical interview question for a software developer. Consider:
- Their background and experience level
- Practical scenarios they might face
- Problem-solving approaches
- Technical concepts relevant to their role
Make it engaging and not too intimidating.`,
    
    behavioral: `Generate a behavioral interview question that explores:
- Teamwork and collaboration
- Problem-solving in challenging situations  
- Leadership or initiative-taking
- Learning and growth experiences
Use the STAR method approach (Situation, Task, Action, Result).`,
    
    closing: `Generate a thoughtful closing question such as:
- Their questions about the role or company
- Career goals and aspirations
- What motivates them professionally
- Why they're interested in this opportunity
Keep it open-ended and engaging.`,
  };

  const prompt = `You are a professional, friendly interviewer conducting a thorough but comfortable interview.

Recent conversation:
${recentMessages}${candidateInfo}

Current phase: ${nextPhase}
Question count: ${questionCount + 1} of ${maxQuestions}

${phasePrompts[nextPhase] || phasePrompts.technical}

Generate a question that:
1. Flows naturally from the previous conversation
2. Is different from what you've already asked
3. Shows genuine interest in the candidate
4. Is clear and not overly complex
5. Feels like a human interviewer would ask it

Respond with just the question, naturally phrased.`;

  try {
    const response = await model.invoke([new SystemMessage(prompt)]);

    return {
      messages: [new AIMessage(response.content)],
      currentQuestion: response.content,
      questionCount: questionCount + 1,
      interviewPhase: nextPhase,
      lastAnswerQuality: "none",
      awaitingUserResponse: true,
    };
  } catch (error) {
    console.error("Error in generateNextQuestion:", error);
    // Fallback question
    const fallbackQuestions = {
      technical: "Can you walk me through how you would approach solving a challenging technical problem?",
      behavioral: "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
      closing: "What questions do you have for me about the role or our company?"
    };
    
    return {
      messages: [new AIMessage(fallbackQuestions[nextPhase] || fallbackQuestions.technical)],
      currentQuestion: fallbackQuestions[nextPhase] || fallbackQuestions.technical,
      questionCount: questionCount + 1,
      interviewPhase: nextPhase,
      lastAnswerQuality: "none",
      awaitingUserResponse: true,
    };
  }
}

async function concludeInterview(state) {
  const { candidateProfile } = state;
  const candidateName = candidateProfile?.name || "there";
  
  const closingMessage = `Thank you so much for taking the time to speak with me today, ${candidateName}! I really enjoyed our conversation and learning about your background and experiences.

You've shared some great insights, and I appreciate your thoughtful responses throughout our discussion.

We'll be reviewing all candidates and will be in touch soon regarding next steps. Do you have any final questions for me before we wrap up?`;

  return {
    messages: [new AIMessage(closingMessage)],
    interviewPhase: "ended",
    awaitingUserResponse: true,
  };
}

async function handleFinalResponse(state) {
  const { candidateProfile } = state;
  const candidateName = candidateProfile?.name || "";
  
  const finalMessage = `Perfect! Thank you again for your time today${candidateName ? `, ${candidateName}` : ''}. 

I enjoyed our conversation, and you've given me a lot of great information to work with. We'll be reviewing all candidates and will get back to you within the next few days with next steps.

Have a wonderful rest of your day!`;

  return {
    messages: [new AIMessage(finalMessage)],
    awaitingUserResponse: false,
  };
}

// Router function - this is the key fix
function routeInterview(state) {
  const { 
    interviewPhase, 
    lastAnswerQuality, 
    questionCount, 
    maxQuestions, 
    messages, 
    awaitingUserResponse,
    conversationStarted 
  } = state;
  
  console.log("Router state:", { 
    interviewPhase, 
    lastAnswerQuality, 
    questionCount, 
    maxQuestions, 
    messagesLength: messages?.length,
    awaitingUserResponse,
    conversationStarted
  });
  
  // If interview has ended and we have a user response, handle it
  if (interviewPhase === "ended") {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage instanceof HumanMessage) {
      return "handleFinalResponse";
    }
    return END;
  }
  
  // Check if we should end the interview
  if (questionCount >= maxQuestions && interviewPhase !== "ended") {
    return "concludeInterview";
  }
  
  // If we're waiting for user response, don't proceed
  if (awaitingUserResponse) {
    return END;
  }
  
  // If we have a new user message that hasn't been analyzed
  const lastMessage = messages[messages.length - 1];
  const hasNewUserMessage = lastMessage && lastMessage instanceof HumanMessage;
  
  if (hasNewUserMessage && lastAnswerQuality === "none") {
    return "analyzeAnswer";
  }
  
  // Handle based on answer quality
  if (lastAnswerQuality === "needs_clarification" || lastAnswerQuality === "insufficient") {
    return "generateFollowUp";
  }
  
  // If answer was good, move to next question
  if (lastAnswerQuality === "good") {
    return "generateNextQuestion";
  }
  
  // Default fallback
  return END;
}

// Build the graph with proper routing
const workflow = new StateGraph({
  channels: StateAnnotation,
})
  .addNode("greetAndAskIntroduction", greetAndAskIntroduction)
  .addNode("analyzeAnswer", analyzeAnswer)
  .addNode("generateFollowUp", generateFollowUp)
  .addNode("generateNextQuestion", generateNextQuestion)
  .addNode("concludeInterview", concludeInterview)
  .addNode("handleFinalResponse", handleFinalResponse)
  .addEdge("__start__", "greetAndAskIntroduction")
  .addConditionalEdges("greetAndAskIntroduction", routeInterview)
  .addConditionalEdges("analyzeAnswer", routeInterview)
  .addConditionalEdges("generateFollowUp", routeInterview)
  .addConditionalEdges("generateNextQuestion", routeInterview)
  .addConditionalEdges("concludeInterview", routeInterview)
  .addConditionalEdges("handleFinalResponse", () => END);

export const graph = workflow.compile();

// Helper function to process user input
export async function processUserInput(state, userMessage) {
  const humanMessage = new HumanMessage(userMessage);
  const updatedState = {
    ...state,
    messages: [...(state.messages || []), humanMessage],
    awaitingUserResponse: false, // We received user input, so we're no longer waiting
    lastAnswerQuality: "none", // Reset to trigger analysis
  };
  
  console.log("Processing user input with state:", {
    phase: updatedState.interviewPhase,
    questionCount: updatedState.questionCount,
    messagesLength: updatedState.messages.length
  });
  
  // Run the graph with the updated state
  try {
    const result = await graph.invoke(updatedState);
    console.log("Graph result:", {
      phase: result.interviewPhase,
      questionCount: result.questionCount,
      awaitingUserResponse: result.awaitingUserResponse,
      messagesLength: result.messages.length
    });
    return result;
  } catch (error) {
    console.error("Error in processUserInput:", error);
    // Return a safe fallback state
    return {
      ...updatedState,
      messages: [...updatedState.messages, new AIMessage("I apologize, but I encountered an issue. Could you please repeat your response?")],
      awaitingUserResponse: true,
    };
  }
}