// import { NextResponse } from 'next/server';
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// export async function POST(req) {
//   try {
//     const { prompt } = await req.json();

//     if (!prompt) {
//       return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
//     }

//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const result = await model.generateContent(prompt);
//     const response = result.response;
//     const itinerary = response.text();

//     return NextResponse.json({ itinerary });
//   } catch (error) {
//     console.error('Error generating itinerary:', error);
//     return NextResponse.json({ error: 'Failed to generate itinerary.' }, { status: 500 });
//   }
// }



import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(req) {
  try {
    const { history } = await req.json()

    // ⛔ validate
    if (!Array.isArray(history))
      return NextResponse.json({ error: 'History array is required.' }, { status: 400 })

    // 📝 build plain-text prompt
    const system =
      `You are a senior human interviewer. Ask ONE concise behavioural or technical question at a time. Also firstly start from the questions about operating system (ask 3 hard level questions about operating system). Ask follow-up questions if required.Then move to Computer Networks (ask 3 hard level questions about Computer Networks) and Ask follow-up questions if required, then move on to Database Management Systems (ask 3 hard level questions about Database Management Systems) and Ask follow-up questions if required,  then move on to System Design (ask 3 hard level questions about System Design) and Ask follow-up questions if required. Do not ask any other question than these topics. Do not repeat the same question. Do not ask any question that is not related to the above topics.And also after every question answer by candidate tell the candidate you feedback for the answer is it correct or not. ~*** And please dont use any special characters and only ask one question at a time. So only start with current question. 
      format:{"Here is the question only"}
       `

    const convo = history
      .map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`)
      .join('\n')
    const promptText = `${system}\n${convo}\nInterviewer:`

    // ⚡ call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(promptText)
    const nextQ = result.response.text().trim() || 'Can you elaborate?'

    return NextResponse.json({ question: nextQ })
  } catch (err) {
    console.error('Gemini interview error:', err)
    return NextResponse.json({ error: 'Failed to generate question.' }, { status: 500 })
  }
}
