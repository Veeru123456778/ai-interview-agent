// import { DynamicTool } from "langchain/tools";

// export const repeatQuestionTool = new DynamicTool({
//   name: "repeatQuestion",
//   description: "Repeats the last question asked.",
//   func: async () => {
//     return global.lastAskedQuestion || "No previous question available.";
//   },
// });

// export const clarifyQuestionTool = new DynamicTool({
//   name: "clarifyQuestion",
//   description: "Explains the last question in simpler terms.",
//   func: async () => {
//     const explanation = await model.invoke(`Explain simply: ${global.lastAskedQuestion}`);
//     return explanation;
//   },
// });

// export const endInterviewTool = new DynamicTool({
//   name: "endInterview",
//   description: "Ends the interview politely.",
//   func: async () => {
//     return "Thanks for your time. The interview is now concluded.";
//   },
// });

// export const tools = [
//   repeatQuestionTool,
//   clarifyQuestionTool,
//   endInterviewTool,
// ];


// import { DynamicTool } from "langchain/tools";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; // or use the model from your workflow file

// const model = new ChatGoogleGenerativeAI({
//   model: "gemini-1.5-flash",
//   temperature: 0.3,
//   apiKey: process.env.GOOGLE_API_KEY,
// });

// // Replace this with interview memory/context logic
// let lastAskedQuestion = "What is a closure in JavaScript?";

// export const repeatQuestionTool = new DynamicTool({
//   name: "repeatQuestion",
//   description: "Repeats the last question asked during the interview.",
//   func: async () => {
//     return lastAskedQuestion || "No previous question available.";
//   },
// });

// export const skipQuestionTool = new DynamicTool({
//   name: "skipQuestion",
//   description: "Skips the last question and moves to the next one.",
//   func: async () => {
//     if (!lastAskedQuestion) return "No previous question to skip.";
//     // Logic to skip the question (e.g., move to the next question)
//     lastAskedQuestion = ""; // Reset or update as needed
//     return "The last question has been skipped. Let's move on.";
//   },
// });



// export const clarifyQuestionTool = new DynamicTool({
//   name: "clarifyQuestion",
//   description: "Explains the last question in simpler terms.",
//   func: async () => {
//     if (!lastAskedQuestion) return "No previous question to clarify.";
//     const explanation = await model.invoke(`Explain this simply: ${lastAskedQuestion}`);
//     return explanation;
//   },
// });

// export const endInterviewTool = new DynamicTool({
//   name: "endInterview",
//   description: "Ends the interview politely and gracefully.",
//   func: async () => {
//     return "Thanks for your time. The interview is now concluded. You did great!";
//   },
// });

// export const provideHintTool = new DynamicTool({
//   name: "provideHint",
//   description: "Provides a small hint for the current question.",
//   func: async () => {
//     if (!lastAskedQuestion) return "No question available to give a hint.";
//     const hint = await model.invoke(`Give a small hint for this interview question: ${lastAskedQuestion}`);
//     return hint;
//   },
// });

// export const pauseInterviewTool = new DynamicTool({
//   name: "pauseInterview",
//   description: "Pauses the interview session.",
//   func: async () => {
//     return "The interview is currently paused. Let me know when you're ready to continue.";
//   },
// });

// export const continueInterviewTool = new DynamicTool({
//   name: "continueInterview",
//   description: "Resumes the interview from where it left off.",
//   func: async () => {
//     return "Welcome back! Let's continue with the interview.";
//   },
// });

// export const tools = [
//   repeatQuestionTool,
//   clarifyQuestionTool,
//   endInterviewTool,
//   provideHintTool,
//   pauseInterviewTool,
//   continueInterviewTool,
// ];



import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

// 1. Define each helper as a “tool”:

export const repeatQuestion = tool(
  async ({ lastQuestion }) => {
    return lastQuestion ?? "No previous question available.";
  },
  {
    name: "repeatQuestion",
    description: "Repeats the last question asked during the interview.",
    schema: z.object({
      lastQuestion: z.string().optional().describe("The last question stored in context"),
    }),
  }
);

export const skipQuestion = tool(
  async ({ lastQuestion }) => {
    if (!lastQuestion) {
      return "No previous question to skip.";
    }
    // In a real agent you’d update memory or context here.
    return "Skipped. Let’s move to the next question.";
  },
  {
    name: "skipQuestion",
    description: "Skips the last question and moves to the next one.",
    schema: z.object({
      lastQuestion: z.string().optional().describe("The last question stored in context"),
    }),
  }
);

export const clarifyQuestion = tool(
  async ({ lastQuestion }) => {
    if (!lastQuestion) {
      return "No previous question to clarify.";
    }
    // Delegate to the same LLM instance for simplification:
    const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash", apiKey: process.env.GOOGLE_API_KEY });
    const explanation = await model.invoke([
      ["user", `Explain this simply: ${lastQuestion}`],
    ]);
    return explanation.response;
  },
  {
    name: "clarifyQuestion",
    description: "Explains the last question in simpler terms.",
    schema: z.object({
      lastQuestion: z.string().optional(),
    }),
  }
);

export const provideHint = tool(
  async ({ lastQuestion }) => {
    if (!lastQuestion) {
      return "No question available to give a hint.";
    }
    const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash", apiKey: process.env.GOOGLE_API_KEY });
    const hint = await model.invoke([
      ["user", `Give a small hint for this interview question: ${lastQuestion}`],
    ]);
    return hint.response;
  },
  {
    name: "provideHint",
    description: "Provides a small hint for the current question.",
    schema: z.object({
      lastQuestion: z.string().optional(),
    }),
  }
);

export const endInterview = tool(
  async () => "Thanks for your time. The interview is now concluded. You did great!",
  {
    name: "endInterview",
    description: "Ends the interview politely and gracefully.",
  }
);

export const pauseInterview = tool(
  async () => "The interview is currently paused. Let me know when you're ready to continue.",
  {
    name: "pauseInterview",
    description: "Pauses the interview session.",
  }
);

export const continueInterview = tool(
  async () => "Welcome back! Let's continue with the interview.",
  {
    name: "continueInterview",
    description: "Resumes the interview from where it left off.",
  }
);

// // 2. Bind them into your LLM:

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-pro",
//   apiKey: process.env.GOOGLE_API_KEY,
//   temperature: 0.3,
// });

// // Pass in “lastQuestion” as part of your agent’s context/memory, not as a global var.
// // Whenever you call the agent, include it in the tool inputs:

// const response = await llm.invoke([
//   ["user", "Could you repeat the last question?"],
// ], {
//   // this binds all your tools at once:

export const  tools =  [
    repeatQuestion,
    skipQuestion,
    clarifyQuestion,
    provideHint,
    endInterview,
    pauseInterview,
    continueInterview,
  ]
//   // And here’s how you inject your “lastQuestion” into tool calls:
//   toolInputs: {
//     repeatQuestion: { lastQuestion: lastAskedQuestion },
//     skipQuestion: { lastQuestion: lastAskedQuestion },
//     clarifyQuestion: { lastQuestion: lastAskedQuestion },
//     provideHint: { lastQuestion: lastAskedQuestion },
//   },
// });

// console.log(response.response);
// console.log(response.tool_calls);
