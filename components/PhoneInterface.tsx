import React, { useEffect, useState } from 'react';
import { ConnectionStatus, LeadData } from '../types';

interface PhoneInterfaceProps {
  status: ConnectionStatus;
  isAiSpeaking: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  leadData: LeadData;
  volume: number;
}

export const PhoneInterface: React.FC<PhoneInterfaceProps> = ({
  status,
  isAiSpeaking,
  onStartCall,
  onEndCall,
  leadData,
  volume
}) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'disconnected') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
           <div className="bg-slate-900 p-8 flex flex-col items-center text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 z-0"></div>
              <div className="w-24 h-24 rounded-full border-4 border-white/20 mb-4 z-10 relative">
                 <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200" 
                    alt="Ananya"
                    className="w-full h-full rounded-full object-cover"
                 />
                 <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold z-10">Ananya</h2>
              <p className="text-blue-200 text-sm font-medium z-10">Sales Executive</p>
              <p className="text-slate-400 text-xs mt-1 z-10">Bharat Diamond Connect</p>
           </div>
           
           <div className="p-8 flex flex-col items-center gap-6">
              <p className="text-center text-slate-600 leading-relaxed">
                Connect with our AI sales agent to explore our exclusive diamond inventory and get personalized assistance.
              </p>
              
              <button 
                onClick={onStartCall}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-full shadow-lg hover:shadow-green-200/50 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">📞</span>
                Start Demo Call
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (status === 'ended') {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
             <div className="bg-slate-800 p-8 flex flex-col items-center text-white text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-3xl mb-4">
                    💎
                </div>
                <h2 className="text-2xl font-bold mb-2">Thank You</h2>
                <p className="text-slate-300 text-sm">Call Summary</p>
             </div>
             
             <div className="p-6 space-y-6">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h3 className="text-blue-900 font-bold mb-2 text-sm uppercase tracking-wide">Dealership Contact</h3>
                    <div className="text-slate-800 font-semibold text-lg">BharatDiamondConnect</div>
                    <div className="text-blue-600 font-bold text-xl mt-1">955 955 001</div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Collected Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-slate-50 p-3 rounded">
                            <span className="block text-xs text-slate-400">Name</span>
                            <span className="font-medium text-slate-700">{leadData.fullName || '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded">
                            <span className="block text-xs text-slate-400">Mobile</span>
                            <span className="font-medium text-slate-700">{leadData.mobile || '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded col-span-2">
                            <span className="block text-xs text-slate-400">Requirements</span>
                            <span className="font-medium text-slate-700">
                                {leadData.diamondShape || 'Any'} shape, {leadData.caratSize || 'Any'} ct
                            </span>
                        </div>
                    </div>
                </div>

                <button 
                  onClick={onStartCall}
                  className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 rounded-xl transition-colors"
                >
                  Start New Call
                </button>
             </div>
          </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>

      {/* Header */}
      <div className="pt-12 pb-6 px-6 flex justify-center z-10">
         <div className="flex flex-col items-center">
            {status === 'connecting' ? (
                <span className="text-slate-400 animate-pulse text-sm font-medium tracking-widest uppercase">Calling...</span>
            ) : (
                <>
                    <span className="text-slate-400 text-sm font-medium tracking-widest uppercase">00:{formatTime(duration)}</span>
                    <span className="text-green-400 text-xs font-bold mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        HD Voice
                    </span>
                </>
            )}
         </div>
      </div>

      {/* Main Avatar Area */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
         <div className="relative">
            {/* Speaking Ripples */}
            {isAiSpeaking && (
                <>
                    <div className="absolute inset-0 rounded-full border border-white/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                    <div className="absolute inset-0 rounded-full border border-white/10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_400ms]"></div>
                </>
            )}
            
            <div className="w-40 h-40 rounded-full border-4 border-slate-700 overflow-hidden shadow-2xl relative z-20">
                 <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400" 
                    alt="Ananya"
                    className="w-full h-full object-cover"
                 />
            </div>
         </div>
         
         <div className="mt-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Ananya</h1>
            <p className="text-blue-300 font-medium">Bharat Diamond Connect</p>
         </div>

         {/* Audio Visualizer (Simple dots) */}
         <div className="h-12 flex items-center gap-1 mt-8">
            {[...Array(5)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-1.5 bg-white/80 rounded-full transition-all duration-75`}
                    style={{ 
                        height: isAiSpeaking 
                            ? `${Math.random() * 24 + 8}px` 
                            : `${Math.max(4, volume * 100 * (Math.random() + 0.5))}px`
                    }}
                ></div>
            ))}
         </div>
      </div>

      {/* Controls */}
      <div className="pb-16 px-10 z-10">
         <div className="flex items-center justify-between max-w-xs mx-auto">
            {/* Mute Button (Visual only for demo) */}
            <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Z"/></svg>
            </button>

            {/* End Call */}
            <button 
                onClick={onEndCall}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transform hover:scale-105 transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="currentColor"><path d="m256-120-40-120 160-200v-320h408v320L742-240 704-120H256Zm86-80h276l30-98-132-154v-320H444v320L314-298l28 98Z"/></svg>
            </button>

             {/* Keypad (Visual only) */}
             <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480ZM160-240v-480 480Z"/></svg>
            </button>
         </div>
      </div>
    </div>
  );
};