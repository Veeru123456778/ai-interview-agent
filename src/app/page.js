// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import EasySpeech from 'easy-speech';

// export default function InterviewPage() {
//   const [voices, setVoices] = useState([]);
//   const [voiceIdx, setVoiceIdx] = useState(0);
//   const [stage, setStage] = useState('idle');
//   const [question, setQuestion] = useState('');
//   const [history, setHistory] = useState([]);
//   const [transcript, setTranscript] = useState('');
//   const [aiSpeaking, setAiSpeaking] = useState(false);
//   const [tID, setTID] = useState(null);

//   const rec = useRef(null);
//   const answered = useRef(false);

//   // Initialize voices
//   useEffect(() => {
//     EasySpeech.init().then(() => setVoices(EasySpeech.voices()));
//   }, []);

//   // Initialize speech recognition
//   useEffect(() => {
//     const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SR) return;

//     const r = new SR();
//     r.lang = 'en-US';
//     r.continuous = true;
//     r.interimResults = false;

//     r.onresult = (e) => {
//       const txt = e.results[e.results.length - 1][0].transcript.trim();
//       if (txt) {
//         answered.current = true;
//         setTranscript((p) => p + '\n🗣 ' + txt);
//       }
//     };

//     rec.current = r;
//     return () => r.abort();
//   }, []);

//   // AI speak function
//   const speak = async (text) => {
//     if (!EasySpeech.status().initialized || !voices[voiceIdx]) return;
//     setAiSpeaking(true);
//     try {
//       await EasySpeech.speak({
//         text,
//         voice: voices[voiceIdx],
//         rate: 1,
//         pitch: 1,
//       });
//     } catch (err) {
//       console.error('Speech error:', err);
//     } finally {
//       setAiSpeaking(false);
//     }
//   };

//   const clearT = () => {
//     if (tID) {
//       clearTimeout(tID);
//       setTID(null);
//     }
//   };

//   const greet = async () => {
//     setStage('greet');
//     await speak('Hello, welcome to your mock interview. How are you today?');
//     await nextQ();
//   };

//   const nextQ = async () => {
//     try {
//       setStage('asking');
//       console.log('History before sending:', history);

//       const res = await fetch('/api/chat/stream', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           messages: history, // Send entire history
//           interviewRoomId: 'room_123',
//         }),
//       });

//       if (!res.ok || !res.body) throw new Error('Failed to stream question from backend');

//       const reader = res.body.getReader();
//       const decoder = new TextDecoder('utf-8');

//       let fullText = '';
//       let done = false;
//       setQuestion('');

//       while (!done) {
//         const { value, done: doneReading } = await reader.read();
//         if (value) {
//           const chunkText = decoder.decode(value, { stream: true });
//           const matches = [...chunkText.matchAll(/data:\s*(\{.*?\})/g)];
//           for (const match of matches) {
//             try {
//               const payload = JSON.parse(match[1]);
//               if (payload.type === 'message' && payload.content) {
//                 fullText += payload.content;
//                 setQuestion((q) => q + payload.content);
//               }
//             } catch (e) {
//               console.warn('JSON parse error in SSE chunk:', e);
//             }
//           }
//         }
//         done = doneReading;
//       }

//       // ✅ Add AI question to history
//       if (fullText.trim()) {
//         setHistory((h) => [...h, { role: 'assistant', content: fullText }]);
//         await speak(fullText);
//       }

//       setStage('waiting');
//       answered.current = false;

//       clearT();
//       setTID(
//         setTimeout(() => {
//           if (!answered.current) clarify();
//         }, 30000)
//       );
//     } catch (error) {
//       console.error('Error in nextQ:', error);
//       setQuestion('Something went wrong. Let me try again.');
//       await speak('Something went wrong. Let me try again.');
//       setStage('waiting');
//     }
//   };

//   const clarify = async () => {
//     await speak('Are you able to understand the question?');
//     clearT();
//     setTID(
//       setTimeout(() => {
//         if (!answered.current) nextQ();
//       }, 15000)
//     );
//   };

//   const startAnswer = () => {
//     if (stage !== 'waiting' || !rec.current) return;
//     try {
//       rec.current.start();
//       setStage('answering');
//       clearT();
//     } catch (err) {
//       console.error('Speech recognition error:', err);
//     }
//   };

//   const stopAnswer = async () => {
//     if (stage !== 'answering') return;
//     rec.current.stop();
//     const ans =
//       transcript
//         .split('\n')
//         .filter((l) => l.startsWith('🗣'))
//         .pop()
//         ?.replace('🗣 ', '') || '';

//     if (ans.trim()) {
//       setHistory((h) => [...h, { role: 'user', content: ans }]); // ✅ Add user answer
//     }

//     setTranscript('');
//     await speak('Thank you.');
//     await nextQ();
//   };

//   const end = async () => {
//     clearT();
//     rec.current?.stop();
//     setStage('idle');
//     setQuestion('');
//     setHistory([]);
//     setTranscript('');
//     await speak('This concludes the interview. Have a great day.');
//   };

//   return (
//     <div className="p-6 max-w-2xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6">🎙️ AI Mock Interview</h1>

//       {stage === 'idle' && (
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded"
//           onClick={greet}
//           disabled={voices.length === 0 || aiSpeaking}
//         >
//           Start Interview
//         </button>
//       )}

//       {stage !== 'idle' && (
//         <button
//           className="bg-red-600 text-white px-4 py-2 rounded mr-3"
//           onClick={end}
//           disabled={aiSpeaking}
//         >
//           End Interview
//         </button>
//       )}

//       {stage === 'waiting' && (
//         <button
//           className="bg-green-600 text-white px-4 py-2 rounded"
//           onClick={startAnswer}
//           disabled={aiSpeaking}
//         >
//           Start Answer
//         </button>
//       )}

//       {stage === 'answering' && (
//         <button
//           className="bg-yellow-600 text-white px-4 py-2 rounded"
//           onClick={stopAnswer}
//         >
//           Stop Answer
//         </button>
//       )}

//       <div className="my-4">
//         <label className="mr-2 font-medium">Voice:</label>
//         <select
//           className="p-2 border rounded"
//           value={voiceIdx}
//           onChange={(e) => setVoiceIdx(+e.target.value)}
//           disabled={stage !== 'idle'}
//         >
//           {voices.map((v, i) => (
//             <option key={i} value={i}>
//               {v.name} ({v.lang})
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="bg-gray-100 p-4 rounded min-h-[180px] whitespace-pre-wrap">
//         {question && `🤖 ${question}\n\n`}
//         {transcript || '—'}
//       </div>
//     </div>
//   );
// }



'use client';

import { useEffect, useRef, useState } from 'react';
import EasySpeech from 'easy-speech';
import { Mic, StopCircle, Play, XCircle } from 'lucide-react';

export default function InterviewPage() {
  const [voices, setVoices] = useState([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [stage, setStage] = useState('idle'); // idle | asking | waiting | answering
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const rec = useRef(null);
  const answered = useRef(false);
  const chatContainerRef = useRef(null);

  // ✅ Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, question]);

  // ✅ Initialize voices
  useEffect(() => {
    EasySpeech.init().then(() => setVoices(EasySpeech.voices()));
  }, []);

  // ✅ Initialize speech recognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const txt = e.results[e.results.length - 1][0].transcript.trim();
      if (txt) {
        answered.current = true;
        setTranscript((p) => p + '\n🗣 ' + txt);
      }
    };
    rec.current = r;
    return () => r.abort();
  }, []);

  // ✅ AI Speak Function
  const speak = async (text) => {
    if (!EasySpeech.status().initialized || !voices[voiceIdx]) return;
    setAiSpeaking(true);
    try {
      await EasySpeech.speak({
        text,
        voice: voices[voiceIdx],
        rate: 1,
        pitch: 1,
      });
    } catch (err) {
      console.error('Speech error:', err);
    } finally {
      setAiSpeaking(false);
    }
  };

  // ✅ Start Interview
  const greet = async () => {
    setStage('greet');
    await speak('Hello, welcome to your mock interview. How are you today?');
    await nextQ();
  };

  // ✅ Fetch next question via SSE
  const nextQ = async () => {
    try {
      setStage('asking');
      setLoadingQuestion(true);
      setQuestion('');
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          interviewRoomId: 'room_123',
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to stream question from backend');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let fullText = '';
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          const matches = [...chunkText.matchAll(/data:\s*(\{.*?\})/g)];
          for (const match of matches) {
            try {
              const payload = JSON.parse(match[1]);
              if (payload.type === 'message' && payload.content) {
                fullText += payload.content;
                setQuestion((q) => q + payload.content);
              }
            } catch (e) {
              console.warn('JSON parse error in SSE chunk:', e);
            }
          }
        }
        done = doneReading;
      }

      if (fullText.trim()) {
        setHistory((h) => [...h, { role: 'assistant', content: fullText }]);
        await speak(fullText);
      }

      setStage('waiting');
      setLoadingQuestion(false);
      answered.current = false;
    } catch (error) {
      console.error('Error in nextQ:', error);
      setQuestion('Something went wrong. Let me try again.');
      await speak('Something went wrong. Let me try again.');
      setStage('waiting');
    }
  };

  const startAnswer = () => {
    if (stage !== 'waiting' || !rec.current) return;
    try {
      rec.current.start();
      setStage('answering');
    } catch (err) {
      console.error('Speech recognition error:', err);
    }
  };

  const stopAnswer = async () => {
    if (stage !== 'answering') return;
    rec.current.stop();
    const ans =
      transcript
        .split('\n')
        .filter((l) => l.startsWith('🗣'))
        .pop()
        ?.replace('🗣 ', '') || '';

    if (ans.trim()) {
      setHistory((h) => [...h, { role: 'user', content: ans }]);
    }

    setTranscript('');
    await speak('Thank you.');
    await nextQ();
  };

  const end = async () => {
    rec.current?.stop();
    setStage('idle');
    setQuestion('');
    setHistory([]);
    setTranscript('');
    await speak('This concludes the interview. Have a great day.');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 rounded-xl shadow-lg min-h-screen flex flex-col">
      <h1 className="text-4xl font-bold mb-6 text-center text-indigo-600">🎙️ AI Mock Interview</h1>

      {/* Chat Window */}
      <div
        ref={chatContainerRef}
        className="flex-1 bg-white rounded-lg p-4 overflow-y-auto border mb-4 shadow-inner"
      >
        {history.map((msg, i) => (
          <div
            key={i}
            className={`my-2 flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`p-3 rounded-xl max-w-[75%] ${
                msg.role === 'assistant'
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'bg-green-100 text-green-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {question && (
          <div className="my-2 flex justify-start">
            <div className="p-3 rounded-xl bg-indigo-100 text-indigo-900 max-w-[75%]">
              {question}
            </div>
          </div>
        )}
        {stage === 'answering' && transcript && (
          <div className="my-2 flex justify-end">
            <div className="p-3 rounded-xl bg-green-100 text-green-900 max-w-[75%]">
              {transcript}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mt-4">
        {stage === 'idle' && (
          <button
            onClick={greet}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md"
            disabled={voices.length === 0 || aiSpeaking}
          >
            Start Interview
          </button>
        )}

        {stage !== 'idle' && (
          <button
            onClick={end}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
            disabled={aiSpeaking}
          >
            <XCircle size={20} /> End
          </button>
        )}

        {stage === 'waiting' && (
          <button
            onClick={startAnswer}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
            disabled={aiSpeaking}
          >
            <Mic size={20} /> Start Answer
          </button>
        )}

        {stage === 'answering' && (
          <button
            onClick={stopAnswer}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <StopCircle size={20} /> Stop Answer
          </button>
        )}
      </div>

      {/* Voice Selector */}
      <div className="my-4 text-center">
        <label className="mr-2 font-medium">Voice:</label>
        <select
          className="p-2 border rounded"
          value={voiceIdx}
          onChange={(e) => setVoiceIdx(+e.target.value)}
          disabled={stage !== 'idle'}
        >
          {voices.map((v, i) => (
            <option key={i} value={i}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
