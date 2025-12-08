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

  const val = (v: string | null) => v || 'N/A';

  // -----------------------------------------------------------------------
  // RENDER: DISCONNECTED / ERROR / PERMISSION DENIED (START SCREEN)
  // -----------------------------------------------------------------------
  if (status === 'disconnected' || status === 'error' || status === 'permission_denied') {
    return (
      <div className="phone-screen light flex flex-col h-full">
         {/* Top Decoration - Flexible height but constrained */}
         <div style={{ 
             flexShrink: 0,
             height: '35%', 
             minHeight: '220px',
             background: '#0f172a', 
             borderBottomLeftRadius: '2.5rem', 
             borderBottomRightRadius: '2.5rem', 
             display: 'flex', 
             flexDirection: 'column', 
             alignItems: 'center', 
             justifyContent: 'center', 
             position: 'relative' 
         }}>
             <div className="avatar-lg" style={{ 
                 width: '8rem', 
                 height: '8rem', 
                 marginBottom: '-4rem', 
                 border: '4px solid white', 
                 boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
             }}>
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300&h=300" 
                  alt="Ananya"
                />
             </div>
         </div>

         {/* Scrollable Content Area */}
         <div className="scroll-content flex-1 flex flex-col items-center pt-20 w-full">
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem', textAlign: 'center' }}>Ananya</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '2rem', textAlign: 'center' }}>AI Diamond Sales Executive</p>
            
            {status === 'error' && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#b91c1c', fontSize: '0.875rem', textAlign: 'center', width: '90%' }}>
                  <strong>System Unavailable</strong><br/>Please try again later.
              </div>
            )}

            {status === 'permission_denied' && (
              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#c2410c', fontSize: '0.875rem', textAlign: 'center', width: '90%' }}>
                  <strong>Microphone Required</strong><br/>Please allow microphone access.
              </div>
            )}
            
            {status === 'disconnected' && (
              <div style={{ textAlign: 'center', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', padding: '0 1.5rem' }}>
                  <p>Welcome to <strong>BharatDiamondConnect</strong>.</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>I can help you browse our certified diamond inventory and connect you with top manufacturers.</p>
              </div>
            )}
         </div>

         {/* Bottom Actions - Fixed at bottom */}
         <div className="bottom-actions w-full">
            <button 
              onClick={onStartCall}
              className="btn-primary"
            >
              <span style={{ fontSize: '1.25rem' }}>📞</span>
              {status === 'permission_denied' ? 'Try Again' : status === 'error' ? 'Retry Connection' : 'Start Call'}
            </button>
         </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // RENDER: CALL ENDED (SUMMARY SCREEN)
  // -----------------------------------------------------------------------
  if (status === 'ended') {
    return (
        <div className="phone-screen light flex flex-col h-full">
            <div className="summary-header">
               <div style={{ width: '4rem', height: '4rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1rem' }}>
                   💎
               </div>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Call Summary</h2>
               <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>Thank you for speaking with us</p>
            </div>
            
            <div className="scroll-content flex-1">
               <div className="contact-card">
                   <h3 style={{ color: '#1e3a8a', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Dealership Contact</h3>
                   <div style={{ color: '#1e293b', fontWeight: 700, fontSize: '1.125rem' }}>BharatDiamondConnect</div>
                   <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.25rem', marginTop: '0.25rem' }}>955 955 001</div>
               </div>

               <div>
                   <h4 style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>Lead Details</h4>
                   
                   {leadData.summary && (
                     <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '1rem', marginBottom: '1.25rem', fontSize: '0.9rem', color: '#334155', borderLeft: '4px solid #3b82f6', lineHeight: 1.5 }}>
                       {leadData.summary}
                     </div>
                   )}

                   <div className="summary-grid">
                       <div className="summary-item">
                           <span className="summary-label">Full Name</span>
                           <span className="summary-value">{val(leadData.fullName)}</span>
                       </div>
                       <div className="summary-item">
                           <span className="summary-label">Mobile</span>
                           <span className="summary-value">{val(leadData.mobile)}</span>
                       </div>
                       <div className="summary-item">
                           <span className="summary-label">Location</span>
                           <span className="summary-value">{val(leadData.location)}</span>
                       </div>
                       <div className="summary-item">
                           <span className="summary-label">Diamond Shape</span>
                           <span className="summary-value">{val(leadData.diamondShape)}</span>
                       </div>
                       <div className="summary-item">
                           <span className="summary-label">Carat Size</span>
                           <span className="summary-value">{val(leadData.caratSize)}</span>
                       </div>
                       <div className="summary-item">
                           <span className="summary-label">Price Range</span>
                           <span className="summary-value">{val(leadData.priceRange)}</span>
                       </div>
                   </div>
               </div>
            </div>

            <div className="bottom-actions">
              <button 
                onClick={onStartCall}
                className="btn-secondary"
              >
                Start New Call
              </button>
            </div>
        </div>
      );
  }

  // -----------------------------------------------------------------------
  // RENDER: CONNECTED / CONNECTING (LIVE CALL)
  // -----------------------------------------------------------------------
  return (
    <div className="phone-screen flex flex-col h-full">
      {/* Background Decor */}
      <div className="background-glow"></div>

      {/* Header */}
      <div className="call-header">
         <div className="flex flex-col items-center">
            {status === 'connecting' ? (
                <span className="timer-badge" style={{ animation: 'pulse 1.5s infinite' }}>CONNECTING...</span>
            ) : (
                <>
                    <span className="timer-badge">00:{formatTime(duration)}</span>
                    <span className="hd-badge">
                        <span className="hd-dot"></span>
                        LIVE
                    </span>
                </>
            )}
         </div>
      </div>

      {/* Main Avatar Area */}
      <div className="main-avatar-area">
         <div className="avatar-wrapper">
            {/* Speaking Ripples */}
            {isAiSpeaking && (
                <>
                    <div className="ripple"></div>
                    <div className="ripple ripple-delay"></div>
                </>
            )}
            
            <div className="avatar-lg">
                 <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400" 
                    alt="Ananya"
                 />
            </div>
         </div>
         
         <div className="text-center w-full px-4">
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem', margin: 0 }}>Ananya</h1>
            <p style={{ color: '#93c5fd', fontWeight: 500, margin: 0, fontSize: '0.9rem' }}>Bharat Diamond Connect</p>
         </div>

         {/* Audio Visualizer */}
         <div className="visualizer-container">
            {[...Array(5)].map((_, i) => (
                <div 
                    key={i} 
                    className={`visualizer-bar ${isAiSpeaking ? 'speaking' : ''}`}
                    style={{ 
                        // If not speaking, use volume for subtle movement, otherwise animation handles it
                        height: !isAiSpeaking ? `${Math.max(6, volume * 100 * (Math.random() + 0.5))}px` : undefined 
                    }}
                ></div>
            ))}
         </div>
      </div>

      {/* Controls */}
      <div className="controls-area">
         <div className="controls-row">
            <button className="btn-control">
                {/* Mute Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Z"/></svg>
            </button>

            {/* End Call */}
            <button 
                onClick={onEndCall}
                className="btn-end-call"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="currentColor"><path d="m256-120-40-120 160-200v-320h408v320L742-240 704-120H256Zm86-80h276l30-98-132-154v-320H444v320L314-298l28 98Z"/></svg>
            </button>

             <button className="btn-control">
                {/* Keypad Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480ZM160-240v-480 480Z"/></svg>
            </button>
         </div>
      </div>
    </div>
  );
};
