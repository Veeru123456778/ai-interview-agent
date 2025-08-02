// 'use server'

// import { NextResponse } from "next/server";
// import { TransformStream } from "stream/web"; // Importing TransformStream to create a stream for SSE
// import { submitQuestion } from "../../../lib/langgraph";
// import { ToolMessage } from "@langchain/core/messages";

// const SSE_DATA_PREFIX = 'data: ';  // Prefix for data in SSE format
// const SSE_LINE_DELIMITER = '\n\n';  // Delimiter for separating messages in SSE format

// // Function to send a message in Server-Sent Events (SSE) format
// async function sendSSEMessage(writer,data){
//    const encoder = new TextEncoder();  // Encoder to convert string to Uint8Array

// //    encoder.encode(`${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`)  // Encoding the data and adding a newline for SSE format

// // Above line fixed
// await writer.write(encoder.encode(`${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`));  // Writing the encoded data to the stream
// }



// // New fixed post route for new input

// export async function POST(req) {
//     try {
//       const body = await req.json();
//       const { messages, newMessage, interviewRoomId } = body;
//       // const { messages, newMessage, interviewRoomId } = body;
  
//       if (!Array.isArray(messages) || typeof newMessage !== 'string') {
//         return NextResponse.json({ error: 'Invalid input format.' }, { status: 400 });
//       }
  

//         const stream = new TransformStream({},{highWaterMark: 1024});  // Preparing a data structure which supports our stream
//         const writer = stream.writable.getWriter();   // writer allows me to send messages to the stream and as we write to it it passes to the stream as response (to write to the stream)

//        // stream.readable-> as we write to the stream through writer-> passes the value it will go to the response body
//         const response = new NextResponse(stream.readable, {
//             headers: {
//                 'Content-Type': 'text/event-stream',
//                 'Connection': 'keep-alive',
//             },
//         });


//         const startStream = async () =>{
//             try {
//                 // Stream will be implemented here
//                 await sendSSEMessage(writer, { type: 'start', content: 'Hi Varun, firstly introduce yourself.' });

//                 // Assuming we have a MongoDB collection named 'interviewRooms' and we are updating the messages array with the new message
//                 // await interviewRoom.updateOne(
//                 //     { _id: interviewRoomId },
//                 //     { $push: { messages: { role: 'interviewer', content: 'Hi Varun, firstly introduce yourself.' } } }
//                 // );

//                 // Convert the messages to our langchain format

//                 const langChainMessages = [
//                     ...messages.map(msg => ({
//                         role: msg.role,  // Convert human to user and assistant to assistant
//                         content: msg.content
//                     })),
//                     { role: 'user', content: newMessage }  // Adding the new message as user
//                 ];
        
//                 // Here we would call the function to submit the question and stream the response
//                 try{
//                     // This eventStream is a iterable readable stream that we can use to read the messages as they come in
//                    const eventStream = await submitQuestion(langChainMessages, interviewRoomId);  // Assuming submitQuestion is a function that returns an event stream

//                    // Process the events

//                    for await(const event of eventStream){
//                       // console.log(event);  
//                       // on_chat_model_stream-> This is the event when model streams a new chunk to the user...
//                       if(event.event === "on_chat_model_stream"){
//                         // The chunks are the messages that are streamed from the model
//                          const token = event.data.chunk; 
//                          console.log("Token: ", token);  // Logging the token for debugging

//                          if(token){
//                             const text = token.content || "";
//                             // const text = token.content.at[0]?.["text"];

//                             if(text){
//                                 await sendSSEMessage(writer, { type: 'message', content: text });  // Sending the message to the stream
                                
//                                 // Update the interview room with the new message
//                                 // await interviewRoom.updateOne(
//                                 //     { _id: interviewRoomId },
//                                 //     { $push: { messages: { role: 'assistant', content: text } } }
//                                 // );
//                             }
//                          }
//                       }
//                       //This is the event when tool get started with an input
//                       else if(event.event === "on_tool_start"){
//                          await sendSSEMessage(writer,{ 
//                                 type: 'tool_start',
//                                 tool:event.name || 'unknown_tool',  // Sending the tool start event to the stream
//                                 input: event.data.input, 
//                             });  // Sending the tool start event to the stream
//                       }

//                       //This is the event where tools provides the output
//                       else if(event.event === "on_tool_end"){
//                             const toolMessage = new ToolMessage(event.data.output);  // Assuming event.data.output is a ToolMessage
                            
//                             await sendSSEMessage(writer, {
//                                 type: 'tool_end',
//                                 tool: toolMessage.lc_kwargs.name || 'unknown_tool',  // Sending the tool end event to the stream
//                                 output: event.data.output,  // Sending the tool output to the stream
//                             });

//                       }
//                     // ans SSE message to Frontend says that event type is done 
//                     //   await sendSSEMessage(writer, { type: 'message', content: event.data });  // Sending the message to the stream
//                    }


//                 }catch(streamError){ // This is the event stream for our submit question
//                     console.error('Error processing messages:', streamError);
//                     await sendSSEMessage(writer, { type: 'error', error: streamError?streamError.message:'Failed to process messages.' });
//                     return;
//                 }                
//             } catch (error) { // Error in overall Streaming
//                 console.error('Error writing to stream:', error);
//             }

//             finally{
//                 try{
//                     await writer.close();  // Closing the writer to end the stream
//                 }catch(closeError){
//                     console.error('Error closing the writer:', closeError);
//                 }
//             }
//         }
 
//         startStream();

//         return response;  // Return the response with the stream

//    }
//    catch(error){
//         console.error('Error in chat stream route:', error);
//         return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
//    }
// }



