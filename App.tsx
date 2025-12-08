import React, { useState, useRef } from 'react';
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
    },
  },
};

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

  const addLog = (role: 'user' | 'model' | 'system', text: string) => {
    setLogs(prev => [...prev, { role, text, timestamp: new Date() }]);
  };

  const connectToGemini = async () => {
    if (!process.env.API_KEY) {
      alert("API Key not found in environment.");
      return;
    }

    setStatus('connecting');
    setLeadData(INITIAL_LEAD_DATA);
    addLog('system', 'Dialing...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const volInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
          setVolume(sum / dataArray.length / 128);
      }, 100);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateLeadTool] }],
          systemInstruction: {
            parts: [{
              text: `You are Ananya, a Sales Executive from BharatDiamondConnect. You are conducting a phone call lead generation campaign.
              
              YOUR GOAL: Collect lead details (Name, Mobile, Location) and diamond requirements (Shape, Price, Carat).

              SCRIPT FLOW (Strictly follow this order):
              1. **Connect & Intro**: "Namaste, I am Ananya from BharatDiamondConnect. We help you find the best certified diamonds directly from manufacturers. Is this a good time to speak?"
              2. **Wait for confirmation**: If user says yes/ok, proceed. If no, say "No problem, have a good day" and stop.
              3. **Contact Details**: 
                 - Ask: "May I know your full name please?" -> [Wait/Tool Update]
                 - Ask: "And your mobile number?" -> [Wait/Tool Update]
                 - Ask: "And your location?" -> [Wait/Tool Update]
              4. **Diamond Needs**:
                 - Ask: "What diamond shape are you looking for?" 
                   * NOTE: If user asks "What is available?", list: Round, Pear, Oval, Marquise. Otherwise do not list them.
                 - Ask: "What is your price range?"
                 - Ask: "And the carat size?"
              5. **Closing**:
                 - Say: "Thank you [Name]. I have noted your requirements. Please note down our dealership contact: BharatDiamondConnect, and our mobile number is 955 955 001. We will share the inventory details with you shortly on WhatsApp. Have a nice day."

              TONE: Professional, polite, like a real human phone agent. Brief and clear.
              TOOL USE: Call 'updateLeadInfo' whenever you get new information.` 
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
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
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
                    setIsAiSpeaking(true);
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        setIsAiSpeaking(false);
                    }
                };
              } catch (e) {
                console.error("Audio decode error", e);
              }
            }
          },
          onclose: () => {
            setStatus('ended');
            setIsAiSpeaking(false);
            clearInterval(volInterval);
          },
          onerror: () => {
            setStatus('error');
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (e) {
      setStatus('error');
    }
  };

  const endCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    // Note: We keep outputAudioContext open for potential UI sounds, or close if strict.
    
    sessionPromiseRef.current?.then((session: any) => {
        if(session.close) session.close();
    });
    
    setStatus('ended');
  };

  const restart = () => {
      setStatus('disconnected');
      setLeadData(INITIAL_LEAD_DATA);
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