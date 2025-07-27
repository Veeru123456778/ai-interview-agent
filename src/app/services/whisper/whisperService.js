// import axios from "axios";
// import FormData from "form-data";
// import fs from "fs";

// const transcribeAudio = (async(buffer)=> {
//   const model = "openai/whisper-large-v3";

//   const form = new FormData();
//   form.append("file", buffer, {
//     filename: "audio.wav",
//     contentType: "audio/wav",
//   });

//   try {
//     const response = await axios.post(
//       `https://api-inference.huggingface.co/models/${model}`,
//       form,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HF_TOKEN}`,
//           ...form.getHeaders(),
//         },
//         maxContentLength: Infinity,
//         maxBodyLength: Infinity,
//       }
//     );

//     return response.data.text || response.data;
//   } catch (error) {
//     console.error("Whisper transcription error:", error.response?.data || error.message);
//     throw new Error("Transcription failed");
//   }
// });

// export default transcribeAudio;

import axios from "axios";

const transcribeAudio = async (buffer) => {
  const model = "openai/whisper-large-v3";

  try {
    // const response = await axios.post(
    //   `https://router.huggingface.co/hf-inference/models/${model}`,
    //   buffer,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.HF_TOKEN}`,
    //       "Content-Type": "audio/webm", // Use the correct type matching your frontend recording
    //     },
    //     maxContentLength: Infinity,
    //     maxBodyLength: Infinity,
    //   }
    // );
    
       const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "audio/webm",
                },
                method: "POST",
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();
        return result;
    // return response.data.text || response.data;
  } catch (error) {
    console.error("Whisper transcription error:", error.response?.data || error.message);
    throw new Error("Transcription failed");
  }
};

export default transcribeAudio;
