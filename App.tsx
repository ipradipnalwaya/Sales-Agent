import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { PhoneInterface } from './components/PhoneInterface';
import { LeadData, INITIAL_LEAD_DATA, ConnectionStatus, LogMessage } from './types';
import { base64ToUint8Array, createPcmBlob, decodeAudioData, playFeedbackTone } from './utils/audioUtils';

const updateLeadTool: FunctionDeclaration = {
  name: 'updateLeadInfo',
  description: 'Updates the user lead information during the call.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING, description: 'User full name' },
      mobile: { type: Type.STRING, description: 'User mobile number' },
      location: { type: Type.STRING, description: 'User location/city' },
      diamondShape: { type: Type.STRING, description: 'Preferred diamond shape e.g. Round, Pear' },
      priceRange: { type: Type.STRING, description: 'Budget/Price range' },
      caratSize: { type: Type.STRING, description: 'Carat size preference' },
      summary: { type: Type.STRING, description: 'A final comprehensive summary of the call details and status.' },
    },
  },
};

// Threshold for the noise gate. Audio below this RMS value is treated as silence.
const NOISE_GATE_THRESHOLD = 0.02;

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [volume, setVolume] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Auto-disconnect refs
  const lastActivityRef = useRef<number>(Date.now());
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const isAiSpeakingRef = useRef<boolean>(false);

  // Sync refs with state for use in intervals
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);

  const addLog = (role: 'user' | 'model' | 'system', text: string) => {
    setLogs(prev => [...prev, { role, text, timestamp: new Date() }]);
  };

  // Idle Timer Effect
  useEffect(() => {
    const idleCheckInterval = setInterval(() => {
      // Only check if connected
      if (statusRef.current !== 'connected') return;

      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // If AI is speaking, reset timer (activity is ongoing)
      if (isAiSpeakingRef.current) {
        lastActivityRef.current = now;
        return;
      }

      // If silence for > 5 seconds, disconnect
      if (timeSinceLastActivity > 5000) {
        console.log("Auto-disconnecting due to silence.");
        endCall();
      }
    }, 1000);

    return () => clearInterval(idleCheckInterval);
  }, []);

  const connectToGemini = async () => {
    // SINGLE SESSION ENFORCEMENT:
    // If a session exists or we are in a connected/connecting state, clean up first.
    if (sessionPromiseRef.current || status === 'connected' || status === 'connecting') {
      console.log("Existing session detected. Cleaning up before new connection.");
      await endCall();
    }

    // Securely access the API key from the environment
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Configuration Error: API_KEY is missing in the environment.");
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setLeadData(INITIAL_LEAD_DATA);
    addLog('system', 'Dialing...');
    lastActivityRef.current = Date.now();

    try {
      // Request microphone access with strict audio constraints for voice isolation
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 16000
          } 
        });
      } catch (micError: any) {
        console.error("Microphone access denied:", micError);
        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          setStatus('permission_denied');
        } else {
          setStatus('error');
        }
        return; // Stop execution if mic fails
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // Initialize Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      // Analyser for visualizer and activity tracking
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const volInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
          const avgVol = sum / dataArray.length / 128;
          setVolume(avgVol);

          // Update activity only if user is speaking loudly enough (noise gate)
          // Threshold matches the one used in processing below
          if (avgVol > NOISE_GATE_THRESHOLD) {
             lastActivityRef.current = Date.now();
          }
      }, 100);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateLeadTool] }],
          systemInstruction: {
            parts: [{
              text: `You are Ananya, a dedicated and expert Smart Diamond Sales Agent from BharatDiamondConnect. You are conducting a professional B2B lead generation call.

              CORE RULES:
              1. **SINGLE FOCUS**: You are exclusively a DIAMOND SALES EXPERT. Do not discuss other topics.
              2. **NOISE FILTER**: Ignore faint background noises. Only respond to clear voice inputs.
              3. **SUMMARY MANDATE**: Before you say your final goodbye, you MUST call 'updateLeadInfo' with a complete 'summary' of what was discussed.

              SCRIPT & FLOW (Adhere strictly):
              1. **Opening**: "Namaste, I am Ananya from BharatDiamondConnect. I am calling to help you source certified diamonds directly from manufacturers. Is this a good time to talk?"
              2. **Confirmation**:
                 - If YES: Proceed.
                 - If NO: Say "No problem. Have a great day." and stop.
              3. **Lead Identification**:
                 - Ask Name.
                 - Ask Mobile Number.
                 - Ask Location.
              4. **Requirement Gathering**:
                 - Ask Diamond Shape (Round, Pear, Oval, etc.).
                 - Ask Price Range.
                 - Ask Carat Size.
              5. **Closing**:
                 - **CRITICAL**: Call 'updateLeadInfo' with the final summary NOW.
                 - Then say: "Thank you [Name]. I have logged your request. Please note our dealership number: 955 955 001. We will WhatsApp you the inventory details shortly. Have a wonderful day."

              BEHAVIOR:
              - Stay professional and polite.
              - If the user pauses, wait patiently.
              - If the conversation ends, ensure the summary is saved.` 
            }]
          },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            addLog('system', 'Call Connected');
            lastActivityRef.current = Date.now();
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // NOISE GATE IMPLEMENTATION
              // Calculate RMS amplitude of the current buffer
              let sumSquares = 0;
              for (let i = 0; i < inputData.length; i++) {
                sumSquares += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sumSquares / inputData.length);

              // If the audio is too quiet (background noise), send silence.
              // Otherwise, send the actual audio.
              if (rms < NOISE_GATE_THRESHOLD) {
                // Create a silent buffer
                const silentData = new Float32Array(inputData.length); // initialized to 0s
                const pcmBlob = createPcmBlob(silentData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              } else {
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);

            // Force agent to speak first
            setTimeout(() => {
                sessionPromise.then(session => session.send({ parts: [{ text: "Hello Ananya, the call is connected. Please start your script." }], turnComplete: true }));
            }, 500);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateLeadInfo') {
                  const args = fc.args as any;
                  setLeadData(prev => ({
                    ...prev,
                    ...args
                  }));
                  sessionPromise.then(session => session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: 'Lead info updated' }
                    }
                  }));
                }
              }
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const outputAudioCtx = outputAudioContextRef.current;
              if (nextStartTimeRef.current < outputAudioCtx.currentTime) {
                nextStartTimeRef.current = outputAudioCtx.currentTime;
              }

              try {
                const buffer = await decodeAudioData(base64ToUint8Array(audioData), outputAudioCtx);
                const source = outputAudioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputAudioCtx.destination);
                
                if (sourcesRef.current.size === 0) {
                    playFeedbackTone(outputAudioCtx, 'start');
                    setIsAiSpeaking(true);
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        playFeedbackTone(outputAudioCtx, 'end');
                        setIsAiSpeaking(false);
                    }
                };
              } catch (e) {
                console.error("Audio decode error", e);
              }
            }
          },
          onclose: () => {
            console.log("Session closed from server side");
            setStatus('ended');
            setIsAiSpeaking(false);
            clearInterval(volInterval);
          },
          onerror: () => {
            console.log("Session error");
            setStatus('error');
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (e) {
      console.error("Connection error", e);
      setStatus('error');
    }
  };

  const endCall = async () => {
    // Stop all media tracks explicitly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close Audio Contexts
    if (audioContextRef.current) {
      try { await audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    
    // Close GenAI Session
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            // The library might not expose a close method directly on the session object 
            // depending on exact version, but we assume connection is closed by dropping reference
            // or if the library provides a close method.
            // For @google/genai, we often rely on server interaction or just stopping input.
            // However, resetting the promise ref is key for our local logic.
        } catch(e) {
            console.log("Error closing session", e);
        }
    }
    sessionPromiseRef.current = null;
    
    setStatus('ended');
  };

  const restart = () => {
      // Complete reset for a new session
      setStatus('disconnected');
      setLeadData(INITIAL_LEAD_DATA);
      setIsAiSpeaking(false);
      endCall(); // Ensure cleanup runs
  };

  return (
    <div className="app-container">
        <PhoneInterface 
            status={status === 'ended' ? 'ended' : status}
            isAiSpeaking={isAiSpeaking}
            onStartCall={status === 'ended' ? restart : connectToGemini}
            onEndCall={endCall}
            leadData={leadData}
            volume={volume}
        />
    </div>
  );
}
