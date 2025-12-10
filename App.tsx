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

// Lower threshold for better sensitivity (0.01 - 0.02 is usually good for voice)
const NOISE_GATE_THRESHOLD = 0.02;

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeLanguage, setActiveLanguage] = useState<string>('English');
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

  // Sync refs with state
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);

  const addLog = (role: 'user' | 'model' | 'system', text: string) => {
    setLogs(prev => [...prev, { role, text, timestamp: new Date() }]);
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
      if (now - lastActivityRef.current > 60000) { // 60s silence timeout
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
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const volInterval = setInterval(() => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
          const avgVol = sum / dataArray.length / 128;
          setVolume(avgVol);

          if (avgVol > NOISE_GATE_THRESHOLD) {
             lastActivityRef.current = Date.now();
          }
      }, 100);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateLeadTool] }],
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: {
            parts: [{
              text: `You are Sanya, a Senior Diamond Sales Executive from SanyaGems.
              
              SELECTED LANGUAGE: ${selectedLanguage}
              
              CRITICAL INSTRUCTIONS:
              1. **LANGUAGE MANDATE**: You MUST speak ONLY in ${selectedLanguage} throughout this entire session. Do not switch languages unless explicitly asked.
              2. **IMMEDIATE START**: As soon as the connection opens, greet the user in ${selectedLanguage}. Introduce yourself and explain how you can help.
              3. **ROLE**: You are exclusively a DIAMOND SALES EXPERT. Be professional, warm, and sophisticated.
              4. **NOISE FILTER**: Ignore faint background noises.
              5. **SUMMARY**: Call 'updateLeadInfo' with a summary before saying goodbye.
              
              SCRIPT FLOW:
              1. **Introduction**: "Namaste! I am Sanya from SanyaGems. I specialize in sourcing exquisite diamonds for our exclusive clients. How may I assist you in finding your perfect gem today?" (Translate this concept to ${selectedLanguage}).
              2. **Gather Info**: Ask for their name if not provided, then move to requirements.
              3. **Requirements**: Discuss Shape, Budget, and Carat size.
              4. **Closing**: Call 'updateLeadInfo', then say goodbye.
              ` 
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
              
              let sumSquares = 0;
              for (let i = 0; i < inputData.length; i++) {
                sumSquares += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sumSquares / inputData.length);

              if (rms < NOISE_GATE_THRESHOLD) {
                // Send silence (zeros) if below threshold to save bandwidth and help model's own VAD
                // distinguish silence from background noise.
                const silentData = new Float32Array(inputData.length);
                const pcmBlob = createPcmBlob(silentData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              } else {
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);

            // Trigger immediate greeting without delay
            sessionPromise.then(session => session.send({ 
                parts: [{ text: `(System: The user has connected. IMMEDIATELY greet them in ${selectedLanguage}. Say "Namaste, I am Sanya from SanyaGems" and ask how you can help them find a diamond.)` }], 
                turnComplete: true 
            }));
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateLeadInfo') {
                  const args = fc.args as any;
                  setLeadData(prev => ({ ...prev, ...args }));
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
              // Ensure time is monotonic
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
                        // Small delay to prevent flickering if next chunk comes immediately
                        setTimeout(() => {
                            if (sourcesRef.current.size === 0) {
                                playFeedbackTone(outputAudioCtx, 'end');
                                setIsAiSpeaking(false);
                            }
                        }, 50);
                    }
                };
              } catch (e) {
                console.error("Audio decode error", e);
              }
            }
          },
          onclose: () => {
            console.log("Session closed from server");
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

  const cleanupSession = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Proper cleanup of AudioContexts
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        try { await audioContextRef.current.close(); } catch(e) {}
      }
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      if (outputAudioContextRef.current.state !== 'closed') {
        try { await outputAudioContextRef.current.close(); } catch(e) {}
      }
      outputAudioContextRef.current = null;
    }
    
    sessionPromiseRef.current = null;
    sourcesRef.current.clear();
  };

  const endCall = async () => {
    await cleanupSession();
    setStatus('ended');
  };

  const restart = async () => {
      await cleanupSession();
      setLeadData(INITIAL_LEAD_DATA);
      setIsAiSpeaking(false);
      setStatus('disconnected'); // Reset to Start Screen
  };

  return (
    <div className="app-container">
        <div className="mobile-frame">
          <PhoneInterface 
              status={status === 'ended' ? 'ended' : status}
              activeLanguage={activeLanguage}
              isAiSpeaking={isAiSpeaking}
              onStartCall={status === 'ended' ? restart : connectToGemini}
              onEndCall={endCall}
              leadData={leadData}
              volume={volume}
          />
        </div>
    </div>
  );
}