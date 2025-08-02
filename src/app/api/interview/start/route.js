// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { redis } from "../../../lib/redis";
// import { v4 as uuidv4 } from "uuid";

// export const runtime = "nodejs";

// export async function POST(req) {
//   const { candidateName, jobRole, experienceLevel } = await req.json();
//   const sessionId = uuidv4();
//   const encoder = new TextEncoder();

//   const stream = new ReadableStream({
//     async start(controller) {
//       controller.enqueue(encoder.encode(`event: session\ndata: ${sessionId}\n\n`));
//       const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//       const prompt = `You are a friendly human interviewer for a ${jobRole} role.
//       Candidate: ${candidateName} (${experienceLevel} experience).
//       Start with a warm introduction and ask the first question.`;

//       const result = await model.generateContent(prompt);
//       const firstQuestion = result.response.text();

//       controller.enqueue(encoder.encode(`event: question\ndata: ${JSON.stringify({ question: firstQuestion })}\n\n`));

//     await redis.set(sessionId, JSON.stringify({
//         candidateName,
//         jobRole,
//         experienceLevel,
//         conversation: [{ role: "assistant", content: firstQuestion }]
//       }));
      
//     }
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//     }
//   });
// }




//     //   sessions.set(sessionId, {
//     //     candidateName,
//     //     jobRole,
//     //     experienceLevel,
//     //     conversation: [{ role: "assistant", content: firstQuestion }],
//     //     controller
//     //   });



// export async function GET(req) {
//     const url = new URL(req.url);
//     const candidateName = url.searchParams.get("candidateName") || "Candidate";
//     const jobRole = url.searchParams.get("jobRole") || "Software Engineer";
//     const experienceLevel = url.searchParams.get("experienceLevel") || "Mid-level";
  
//     const encoder = new TextEncoder();
//     const sessionId = uuidv4();
  
//     const stream = new ReadableStream({
//       async start(controller) {
//         controller.enqueue(encoder.encode(`event: session\ndata: ${sessionId}\n\n`));
//         const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
//         const prompt = `You are a friendly interviewer for a ${jobRole} role.
//         Candidate: ${candidateName} (${experienceLevel} experience).
//         Start with a warm introduction and ask the first question.`;
  
//         const result = await model.generateContent(prompt);
//         const firstQuestion = result.response.text();
  
//         controller.enqueue(encoder.encode(`event: question\ndata: ${JSON.stringify({ question: firstQuestion })}\n\n`));
  
//         // sessions.set(sessionId, {
//         //   candidateName,
//         //   jobRole,
//         //   experienceLevel,
//         //   conversation: [{ role: "assistant", content: firstQuestion }],
//         //   controller
//         // });
//         await redis.set(sessionId, JSON.stringify({
//             candidateName,
//             jobRole,
//             experienceLevel,
//             conversation: [{ role: "assistant", content: firstQuestion }]
//           }));
          
//       }
//     });
  
//     return new Response(stream, {
//       headers: {
//         "Content-Type": "text/event-stream",
//         "Cache-Control": "no-cache",
//         Connection: "keep-alive",
//       }
//     });
//   }