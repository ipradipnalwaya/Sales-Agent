import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { PhoneInterface } from './components/PhoneInterface';
import { LeadData, INITIAL_LEAD_DATA, ConnectionStatus, LogMessage } from './types';
import { base64ToUint8Array, createPcmBlob, decodeAudioData, playFeedbackTone } from './utils/audioUtils';

const updateLeadTool: FunctionDeclaration = {
  name: 'updateLeadInfo',
  description: 'Updates the user lead information during the call. Call this whenever new information is provided.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING, description: 'User full name' },
      mobile: { type: Type.STRING, description: 'User mobile number' },
      location: { type: Type.STRING, description: 'User location/city' },
      diamondShape: { type: Type.STRING, description: 'Preferred diamond shape e.g. Round, Pear' },
      priceRange: { type: Type.STRING, description: 'Budget/Price range' },
      caratSize: { type: Type.STRING, description: 'Carat size preference' },
      summary: { type: Type.STRING, description: 'A final comprehensive summary of the specific diamond requirements discussed.' },
    },
  },
};

const endSessionTool: FunctionDeclaration = {
  name: 'endSession',
  description: 'Ends the consultation session. Call this ONLY after saying goodbye and ensuring all details are captured.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// Increased threshold to 0.04 to strictly ignore background noise and focus on loud voice.
const NOISE_GATE_THRESHOLD = 0.04;

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeLanguage, setActiveLanguage] = useState<string>('English');
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD_DATA);
  const [volume, setVolume] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Audio Queue Management for smoother playback
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isPlayingRef = useRef<boolean>(false);
  const speechEndTimeoutRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<any>(null);
  
  // Auto-disconnect and Session control
  const lastActivityRef = useRef<number>(Date.now());
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const isAiSpeakingRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<any>(null);
  const isSessionEndingRef = useRef<boolean>(false);

  // Sync refs with state
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);

  const addLog = (role: 'user' | 'model' | 'system', text: string) => {
    setLogs(prev => [...prev, { role, text, timestamp: new Date() }]);
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  const cleanupSession = async () => {
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      sessionPromiseRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    
    analyserRef.current = null;

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    isPlayingRef.current = false;
    setIsAiSpeaking(false);
    
    if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current);
        speechEndTimeoutRef.current = null;
    }
  };

  const endCall = async () => {
    setStatus('ended');
    await cleanupSession();
    // Play end tone using a temporary context since the main one is closed
    const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    playFeedbackTone(tempCtx, 'end');
    // Close temp context after short delay
    setTimeout(() => tempCtx.close(), 1000);
  };

  // Reset to initial state for a fresh start
  const resetApp = () => {
    setStatus('disconnected');
    setLeadData(INITIAL_LEAD_DATA);
    setLogs([]);
  };

  // Idle Timer Effect
  useEffect(() => {
    const idleCheckInterval = setInterval(() => {
      if (statusRef.current !== 'connected') return;
      const now = Date.now();
      if (isAiSpeakingRef.current) {
        lastActivityRef.current = now;
        return;
      }
      // Changed from 60000 (60s) to 10000 (10s)
      if (now - lastActivityRef.current > 10000) { 
        console.log("Auto-disconnecting due to silence.");
        endCall();
      }
    }, 1000);
    return () => clearInterval(idleCheckInterval);
  }, []);

  const connectToGemini = async (selectedLanguage: string) => {
    if (sessionPromiseRef.current || status === 'connected' || status === 'connecting') {
      await cleanupSession();
    }

    setActiveLanguage(selectedLanguage);
    isSessionEndingRef.current = false;

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Configuration Error: API_KEY is missing.");
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setLeadData(INITIAL_LEAD_DATA);
    addLog('system', 'Dialing...');
    lastActivityRef.current = Date.now();

    try {
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
        setStatus(micError.name === 'NotAllowedError' ? 'permission_denied' : 'error');
        return;
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // Initialize Audio Contexts with interactive latency hint
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000, 
        latencyHint: 'interactive' 
      });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 24000, 
        latencyHint: 'interactive' 
      });
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      // 2048 buffer size = ~128ms latency at 16kHz. Good balance.
      const processor = audioContextRef.current.createScriptProcessor(2048, 1, 1);
      
      const analyser = audioContextRef.current.createAnalyser();
      analyserRef.current = analyser;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      volumeIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
          const avgVol = sum / dataArray.length / 128;
          
          // Force visual volume to 0 if AI is speaking (visual feedback for "mic muted")
          setVolume(isAiSpeakingRef.current ? 0 : avgVol);

          if (avgVol > NOISE_GATE_THRESHOLD && !isAiSpeakingRef.current) {
             lastActivityRef.current = Date.now();
          }
      }, 100);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateLeadTool, endSessionTool] }],
          systemInstruction: {
            parts: [{
              text: `You are Sanya, a Senior Diamond Sales Executive from SanyaGems.
              
              SELECTED LANGUAGE: ${selectedLanguage}
              
              *** INSTRUCTIONS ***
              1. **IMMEDIATE ACTION**: Start speaking immediately. Do NOT wait for user input.
              2. **LANGUAGE**: Speak STRICTLY and ONLY in ${selectedLanguage}. Do not switch languages unless explicitly asked to translate.
              3. **PERSONA**: Real human executive. Warm, professional, efficient. Use fillers ("I see", "Okay", "Right") naturally.
              
              *** STRICT DATA COLLECTION STEPS ***
              Ask ONE QUESTION AT A TIME. Wait for the answer. Do not combine steps.
              
              Step 1: **INTRO & NAME**
                 - "Namaste! I am Sanya from SanyaGems. To begin your consultation, may I have your name please?"
              
              Step 2: **MOBILE NUMBER**
                 - "Thank you. Could you please share your mobile number?"
                 
              Step 3: **LOCATION**
                 - "And which city are you calling from?"
                 
              Step 4: **DIAMOND SHAPE**
                 - "Great. Let's find your perfect diamond. First, what Shape are you looking for? (e.g. Round, Oval, Pear)"
                 
              Step 5: **CARAT SIZE**
                 - "Noted. And what Carat size do you have in mind?"
                 
              Step 6: **BUDGET**
                 - "Understood. Finally, what is your approximate Budget for this stone?"
                 
              Step 7: **SUMMARY & CLOSE**
                 - Summarize strictly: "I have noted: [Shape] diamond, [Carat] carat, around [Budget]."
                 - "I will check our inventory and WhatsApp you the options shortly."
                 - "If you need immediate assistance, please call our dealership at 955 955 789. Thank you!"
                 - **CRITICAL**: IMMEDIATELY call the 'endSession' tool after saying goodbye. Do not wait for user confirmation after goodbye.
                 
              *** DATA HANDLING ***
              - Call 'updateLeadInfo' AFTER EACH ANSWER to save the details immediately.
              - Ensure the 'summary' field is populated at the end.
              ` 
            }]
          },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            addLog('system', 'Call Connected');
            lastActivityRef.current = Date.now();
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // STRICT HALF-DUPLEX LOGIC:
              // If AI is speaking, completely ignore microphone input (send silence or nothing).
              if (isAiSpeakingRef.current) {
                 return; 
              }
              
              let sumSquares = 0;
              for (let i = 0; i < inputData.length; i++) {
                sumSquares += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sumSquares / inputData.length);

              if (rms < NOISE_GATE_THRESHOLD) {
                // Background noise: Send silence to model
                const silentData = new Float32Array(inputData.length);
                const pcmBlob = createPcmBlob(silentData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              } else {
                // Loud voice: Send actual audio
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateLeadInfo') {
                  const args = fc.args as any;
                  setLeadData(prev => ({ ...prev, ...args }));
                  
                  // Format args for toast
                  const keyMap: Record<string, string> = {
                      fullName: 'Name', mobile: 'Mobile', location: 'City',
                      diamondShape: 'Shape', priceRange: 'Budget', caratSize: 'Carat',
                      summary: 'Summary'
                  };
                  const updates = Object.entries(args)
                      .filter(([k, v]) => v && k !== 'summary')
                      .map(([k, v]) => `${keyMap[k] || k}: ${v}`)
                      .join(' | ');

                  if (updates) showToast(`Saved: ${updates}`);

                  sessionPromise.then(session => session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: 'Lead info updated' }
                    }
                  }));
                } else if (fc.name === 'endSession') {
                   showToast("Wrapping up consultation...");
                   isSessionEndingRef.current = true;
                   
                   // Respond to the tool
                   sessionPromise.then(session => session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: 'Session ending' }
                    }
                  }));

                  // If not speaking, end immediately. If speaking, onended will handle it.
                  if (!isPlayingRef.current) {
                    setTimeout(() => endCall(), 1000); 
                  }
                }
              }
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              audioQueueRef.current = audioQueueRef.current.then(async () => {
                if (!outputAudioContextRef.current) return;
                const outputAudioCtx = outputAudioContextRef.current;
                
                try {
                  const buffer = await decodeAudioData(base64ToUint8Array(audioData), outputAudioCtx);
                  
                  if (nextStartTimeRef.current < outputAudioCtx.currentTime) {
                    nextStartTimeRef.current = outputAudioCtx.currentTime;
                  }

                  if (!isPlayingRef.current) {
                    if (speechEndTimeoutRef.current) {
                      clearTimeout(speechEndTimeoutRef.current);
                      speechEndTimeoutRef.current = null;
                    }
                    
                    playFeedbackTone(outputAudioCtx, 'start');
                    isPlayingRef.current = true;
                    setIsAiSpeaking(true);
                  }

                  const source = outputAudioCtx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(outputAudioCtx.destination);
                  
                  source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        // Debounce the "stop speaking" state to avoid flickering between chunks
                        speechEndTimeoutRef.current = setTimeout(() => {
                            setIsAiSpeaking(false);
                            isPlayingRef.current = false;
                            
                            // Check if the session was marked to end by the model
                            if (isSessionEndingRef.current) {
                                endCall();
                            }
                        }, 500);
                    }
                  };

                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                  
                } catch (err) {
                   console.error("Audio decoding error:", err);
                }
              });
            }
          },
          onerror: (e) => {
            console.error("Session error:", e);
            setStatus('error');
            cleanupSession();
          },
          onclose: (e) => {
            console.log("Session closed", e);
            if (statusRef.current === 'connected') {
                setStatus('ended');
            }
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed:", error);
      setStatus('error');
      cleanupSession();
    }
  };

  return (
    <div className="app-container">
      <div className="mobile-frame">
        <PhoneInterface
          status={status}
          activeLanguage={activeLanguage}
          isAiSpeaking={isAiSpeaking}
          onStartCall={connectToGemini}
          onEndCall={endCall}
          onReset={resetApp}
          leadData={leadData}
          volume={volume}
          toast={toast}
        />
      </div>
    </div>
  );
}