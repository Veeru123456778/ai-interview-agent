// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { sessions } from "../../../lib/sessionStore";
// import { redis } from "../../../lib/redis";
// import { v4 as uuidv4 } from "uuid";

// export async function POST(req) {
//   const { sessionId, answer } = await req.json();
//   const sessionData = await redis.get(sessionId);
//   if (!sessionData) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 400 });
  
//   const session = JSON.parse(sessionData);
//   session.conversation.push({ role: "user", content: answer });


//   const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//   const context = session.conversation.map(c => `${c.role}: ${c.content}`).join("\n");

//   const prompt = `Continue the interview naturally based on the previous conversation.
//   Here is the context:\n${context}\n
//   Ask the next relevant question as a human interviewer.`;

//   const result = await model.generateContent(prompt);
//   const nextQuestion = result.response.text();

//   session.conversation.push({ role: "assistant", content: nextQuestion });


//   return new Response(JSON.stringify({ question: nextQuestion }));

// }



// export const runtime = "nodejs";

// export async function GET(req) {
//   const url = new URL(req.url);
//   const candidateName = url.searchParams.get("candidateName") || "Candidate";
//   const jobRole = url.searchParams.get("jobRole") || "Software Engineer";
//   const experienceLevel = url.searchParams.get("experienceLevel") || "Mid-level";

//   const encoder = new TextEncoder();
//   const sessionId = uuidv4();

//   const stream = new ReadableStream({
//     async start(controller) {
//       controller.enqueue(encoder.encode(`event: session\ndata: ${sessionId}\n\n`));

//       try {
//         const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//         const prompt = `You are a friendly interviewer for a ${jobRole} role.
//         Candidate: ${candidateName} (${experienceLevel} experience).
//         Start with a warm introduction and ask the first question.`;

//         const result = await model.generateContentStream({
//           contents: [{ role: "user", parts: [{ text: prompt }] }]
//         });

//         let firstQuestion = "";
//         for await (const chunk of result.stream) {
//           if (chunk.candidates && chunk.candidates[0].content.parts[0].text) {
//             firstQuestion += chunk.candidates[0].content.parts[0].text;
//           }
//         }

//         controller.enqueue(encoder.encode(`event: question\ndata: ${JSON.stringify({ question: firstQuestion })}\n\n`));

//         sessions.set(sessionId, {
//           candidateName,
//           jobRole,
//           experienceLevel,
//           conversation: [{ role: "assistant", content: firstQuestion }],
//           controller
//         });
//       } catch (err) {
//         controller.enqueue(encoder.encode(`event: error\ndata: ${err.message}\n\n`));
//       }
//     }
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive"
//     }
//   });
// }
