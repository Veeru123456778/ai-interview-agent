// // This is the AI file and everything related to AI will be here.
// // This is how we build the AI model and how we use it.
// // import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// 'use server'
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// import { tools } from "./tools";
// import { END, MemorySaver, MessagesAnnotation,START,StateGraph } from "@langchain/langgraph";
// import { SYSTEM_MESSAGE } from "../../../constants/systemMessage";
// import { SystemMessage,trimMessages,AIMessage,HumanMessage } from "@langchain/core/messages";
// import { ChatPromptTemplate,MessagesPlaceholder } from "@langchain/core/prompts";
// import { cache } from "react";


// function makeToolsNode() {
//   return async (state) => {
//     const last = state.messages[state.messages.length - 1];
//     const calls = last.tool_calls || [];
//     const outputs = [];
//     for (const call of calls) {
//       const tool = tools.find((t) => t.name === call.name);
//       if (!tool) continue;
//       const result = await tool.func(call.input);
//       outputs.push({ name: tool.name, output: result });
//     }
//     // wrap each output back into the conversation
//     const messages = [
//       ...state.messages,
//       ...outputs.map((o) => new ToolMessage(o)),
//     ];
//     return { messages };
//   };
// }


// const trimmer = new trimMessages({
//     maxTokens: 10, // I want to trim the last 10 messages to avoid exceeding token limits
//     strategy:'last',
//     // tokenCounter:(msgs)=>msgs.length, // Use a simple length counter for tokens
//     tokenCounter: (msgs) => msgs.reduce((acc, m) => acc + m.content.length, 0), // Count tokens based on content length
//     includeSystem: true, // Include system messages in the trimming process
//     allowPartial: false, // Do not allow partial messages,
//     startOn:"user",
// });


// const initializeModel = async () => {
//   const apiKey = "AIzaSyB0paMNSJ-2cAQMmgEqwfuW7OKdBxW7Cao"; // Ensure you have set this environment variable
//   // const apiKey = process.env.GOOGLE_API_KEY; // Ensure you have set this environment variable
//   console.log("API Key:",typeof apiKey); // Log the API key for debugging purposes

//   if (!apiKey) {
//     throw new Error("GOOGLE_API_KEY is not set. Please define it in your environment.");
//   }
//   console.log(apiKey);
//   const model = new ChatGoogleGenerativeAI({
//     model: "gemini-1.5-flash",
//     apiKey: apiKey, // Ensure you have set this environment variable
//     temperature : 0.2, // Adjust temperature for response variability
//     maxOutputTokens: 2048, // Set maximum output tokens
//     streaming: true, // Enable streaming for real-time responses
//     clientOptions: {
//     defaultHeaders: {    // it enables the prompt caching feature
//         "gemini-beta":"prompt-caching",
//     },
//     },
//     callbacks: [{
//         handleLLMStart: async (response) => {
//             console.log(`Response started: ${response}`); // Log when the response starts
//         },
//         handleLLMNewToken: async (token) => {
//             console.log(`New token: ${token}`); // Log each new token received
//         },
//         handleLLMEnd: async (response) => {
//             console.log(`Response ended: ${response}`); // Log when the response ends
//         },
//         handleLLMError: (error) => {
//             console.error(`Error in LLM: ${error}`); // Log any errors encountered
//         }
//     }
// ],
// },
// ).bindTools(tools);  // Bind tools if you have any, otherwise you can remove this line

// return model;
// }

// function shouldContinue(state) {
//     // This function checks if the conversation should continue based on the last message
//    const messages = state.messages;
//    const lastMessage = messages[messages.length - 1];

//    // Check if the last message is from the AI and has tool calls, then we route to tools node
//    if(lastMessage.tool_calls?.length > 0) {
//     return "tools";
//    }

//    //if the last message is a tool message, we route to agent node
//    if(lastMessage.content && lastMessage._getType() === "tool") {
//          return "agent";
//     }
    
//     // Otherwise we stop and reply to the user
//     return END; // If no conditions are met, end the conversation
// }


// const createWorkflow = async () => {
//   const model = await initializeModel();

//   const stateGraph = new StateGraph(MessagesAnnotation)
//     .addNode("agent", async (state) => {
//       const systemMessage = SYSTEM_MESSAGE;

//       // ✅ Ensure full chat context: system + trimmed user/assistant history
//       const trimmedMessages = await trimmer.invoke(state.messages);

//       // ✅ Build prompt explicitly using template
//       const promptTemplate = ChatPromptTemplate.fromMessages([
//         ["system", systemMessage],
//         ...trimmedMessages.map((msg) => [msg.role, msg.content]),
//       ]);

//       const prompt = await promptTemplate.format({});
//       console.log("Prompt:", prompt);

//       // ✅ Call the model with the full prompt (history + system)
//       const response = await model.invoke(prompt);

//       return { messages: [...state.messages, response] };
//     })
//     .addEdge(START, "agent")
//     .addNode("tools", makeToolsNode()) // Tools node if needed
//     .addConditionalEdges("agent", shouldContinue)
//     .addEdge("agent", "tools");

//   return stateGraph;
// };



// // We will add caching headers to the messages to enable caching of the system message
// function addCachingHeaders(messages){
//    // Rules for caching headers for turn by turn conversation
//  //1. Cache the first system message with type "ephemeral" to allow caching
//  //2. Cache the last message with type "ephemeral" to allow caching
//  //3. Cache the second to last human message with type "ephemeral" to allow caching
//  if(!messages.length){
//     return messages; // If there are no messages, return the empty array
//  }

//  const cachedMessages = [...messages]; // Create a copy of the messages array to avoid mutating the original
//      console.log("Cached Messages before processing: ", cachedMessages); // Log the messages before processing

//     const addCache = (message)=>{

//         if(!message || !message.content) return; // If the message or its content is empty, do nothing
//         const msg = message; // Create a reference to the message

//         message = {
//           ...message,
//           cache_control: { type: "ephemeral" }, // Add caching headers to the message
//         }
//     }
//     const firstSystem = cachedMessages.find(msg => msg.role === "system");
    
//     if (firstSystem) {
//         addCache(firstSystem);
//     }

//     const lastMessage = cachedMessages.at(-1); // Get the last message

//     if(lastMessage){
//     addCache(lastMessage); // Add caching headers to the last message
//     }

//     let humanCount = 0;
    
//     for(let i=cachedMessages.length-1;i>=0;i--){
//         const msg = cachedMessages[i];
//         console.log("Message: ", msg); // Log the messages before processing

//         if( msg && msg.role === "user") { // Check if the message is from a human and we haven't cached a human message yet
//             humanCount++;
//             if(humanCount===2){
//                 addCache(cachedMessages[i]); // Add caching headers to second last human message
//                 break; // Exit the loop after caching the first human message
//             }
//         }
//     }
//    console.log("Cached Messages after processing: ", cachedMessages); // Log the messages after processing
//     return cachedMessages; // Return the modified messages array with caching headers added
// }


// export async function submitQuestion(messages,interviewRoomId) {
//     try {
         
//         const cachedMessages = await addCachingHeaders(messages); // Add caching headers to the messages

//         console.log("Cached Messages: ", cachedMessages); // Log the messages to be sent  and only system messages has the type ephemeral in them so that we can cache them..


//         const workflow = await createWorkflow(); // Create the workflow -> This gives us the graph of the workflow that we have created

//         // This checkpoint and app allows us to make the use of caching and type as {type:"ephemeral"} as we have set in the system message.

//         const checkpointer = new MemorySaver();  // It allows us to save the state of the conversation so our llm is aware of the previous messages (ex: Interview 1 has these messages and can continue the conversation from where it left off.) so like it is for multiple interviews and we can continue the conversation from where it left off.
        
//         const app = workflow.compile({ checkpointer }); // Compile the workflow with the memory saver


//         //Run the graph and the stream the response
//         const stream = await app.streamEvents(
//             {
//                 messages:cachedMessages, // Pass the cached messages to the workflow
//             },
//             {
//                 version:"v2",
//                 configurable:{
//                     thread_id: interviewRoomId, // Pass the interview room ID to the workflow
//                 },
//                 streamMode:'messages', // Set the stream mode to messages to get the response in a stream
//                 runId: interviewRoomId, // Use the interview room ID as the run ID
//             }
//         )
  
//         console.log("Stream is:" ,stream);
//         console.log("Stream ",stream);
//        return stream; // Return the stream to the route itself for processing
//     } catch (error) {
//         console.error("Error in submitQuestion:", error);
//         throw error; // Rethrow the error for handling in the calling function
//     }
// }




'use server';

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tools } from "./tools";
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { SYSTEM_MESSAGE } from "../../../constants/systemMessage";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage } from "@langchain/core/messages";

// ✅ Simple Trimmer: Keep last 6 messages
function trimMessages(messages, limit = 6) {
  const systemMsg = messages.find(msg => msg.role === "system");
  const recentMsgs = messages.filter(msg => msg.role !== "system").slice(-limit);
  return systemMsg ? [systemMsg, ...recentMsgs] : recentMsgs;
}

// ✅ Apply caching headers
function addCachingHeaders(messages) {
  return messages.map((msg, i) => {
    if (msg.role === "system" || i >= messages.length - 2) {
      return { ...msg, cache_control: { type: "ephemeral" } };
    }
    return msg;
  });
}

// ✅ Initialize model
async function initializeModel() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

  return new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey,
    temperature: 0.2,
    maxOutputTokens: 1024,
    streaming: true,
    callbacks: [{
      handleLLMStart: () => console.log("LLM start"),
      handleLLMNewToken: (t) => console.log("Token:", t),
      handleLLMEnd: () => console.log("LLM end"),
      handleLLMError: (err) => console.error("LLM error:", err)
    }]
  }).bindTools(tools);
}

// ✅ Workflow
async function createWorkflow() {
  const model = await initializeModel();

  const stateGraph = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      const systemMessage = SYSTEM_MESSAGE;

      const trimmedMessages = trimMessages(state.messages);
      // const promptTemplate = ChatPromptTemplate.fromMessages([
      //   ["system", systemMessage],
      //   // ...trimmedMessages.map((m) => [m.role, m.content]),
      //   ...trimmedMessages.map((m)=>[
      //      m.role=='user' ? "human" : m.role=='assistant' ? "ai" : m.role,
      //      typeof m.content === "string" ? m.content : JSON.stringify(m.content)

      //   ]),
      //   ["system", "You are conducting a mock interview. Ask ONE question at a time."]
      // ]);
      
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", systemMessage],
        ...trimmedMessages.map((m) => [
          m.role === "user" ? "human" :
          m.role === "assistant" ? "ai" :
          m.role === "system" ? "system" :
          "human",
          typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        ]),
        ["system", "You are conducting a mock interview. Ask ONE question at a time and ***remember dont use any special characters or emojis and also do not repeat questions and dont give answer to user."]
      ]);

      
      const prompt = await promptTemplate.format({});
      const response = await model.invoke(prompt);

      return { messages: [...state.messages, response] };
    })
    .addEdge(START, "agent")
    .addEdge("agent", END);

  return stateGraph;
}

// ✅ Submit question and stream response
export async function submitQuestion(messages, interviewRoomId) {
  try {
    const cachedMessages = addCachingHeaders(messages);
    const workflow = await createWorkflow();
    const checkpointer = new MemorySaver();
    const app = workflow.compile({ checkpointer });

    const stream = await app.streamEvents(
      { messages: cachedMessages },
      {
        version: "v2",
        configurable: { thread_id: interviewRoomId },
        streamMode: "messages",
        runId: interviewRoomId
      }
    );

    return stream;
  } catch (error) {
    console.error("Error in submitQuestion:", error);
    throw error;
  }
}
