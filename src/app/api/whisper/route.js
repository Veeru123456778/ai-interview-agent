// import { NextResponse } from "next/server";
// import transcribeAudio from "../../services/whisper/whisperService.js";

// export const config = {
//   api: {
//     bodyParser: false, // We will use formidable or multer if needed (optional)
//   },
// };

// export async function POST(request) {
//   try {
//     const formData = await request.formData();
//     const audioFile = formData.get("audio");

//     if (!audioFile) {
//       return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
//     }

//     // Convert Blob to buffer
//     const arrayBuffer = await audioFile.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     const transcription = await transcribeAudio(buffer);

//     return NextResponse.json({ transcription });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


import { NextResponse } from "next/server";
import transcribeAudio from "../../services/whisper/whisperService";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await transcribeAudio(buffer);
    return NextResponse.json({ transcript: result });
  } catch (error) {
    console.error("API Route Error:", error.message);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
