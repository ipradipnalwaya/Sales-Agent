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

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Live Call';
      case 'ended': return 'Call Ended';
      case 'error': return 'Connection Failed';
      case 'permission_denied': return 'Microphone Denied';
      default: return 'Ready';
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
     if (status === 'connected') return '#4ade80';
     if (status === 'connecting') return '#fbbf24';
     if (status === 'error' || status === 'permission_denied') return '#ef4444';
     return '#94a3b8';
  };

  // State: Disconnected (Start Screen) or Error or Permission Denied
  if (status === 'disconnected' || status === 'error' || status === 'permission_denied') {
    return (
      <div className="screen-center">
        <div className="card-container">
           <div className="card-header">
              <div className="card-header-overlay"></div>
              <div className="avatar-lg" style={{ width: '6rem', height: '6rem', marginBottom: '1rem', border: '3px solid rgba(255,255,255,0.3)' }}>
                 <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200" 
                    alt="Ananya"
                 />
                 <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '1rem', height: '1rem', backgroundColor: (status === 'error' || status === 'permission_denied') ? '#ef4444' : '#22c55e', borderRadius: '50%', border: '2px solid #0f172a' }}></div>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, zIndex: 10 }}>Ananya</h2>
              <p style={{ color: '#93c5fd', fontSize: '0.875rem', fontWeight: 500, margin: '0.25rem 0 0 0', zIndex: 10 }}>Sales Executive</p>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0', zIndex: 10 }}>Bharat Diamond Connect</p>
           </div>
           
           <div className="card-body">
              {status === 'error' && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', color: '#b91c1c', fontSize: '0.875rem' }}>
                    <strong>Connection Failed.</strong> The system is temporarily unavailable. Please try again later.
                </div>
              )}

              {status === 'permission_denied' && (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', color: '#c2410c', fontSize: '0.875rem' }}>
                    <strong>Microphone Access Denied.</strong><br/> Please allow microphone permissions in your browser settings to start the call.
                </div>
              )}
              
              {status === 'disconnected' && (
                <p style={{ textAlign: 'center', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                    Connect with our AI sales agent to explore our exclusive diamond inventory and get personalized assistance.
                </p>
              )}
              
              <button 
                onClick={onStartCall}
                className="btn-primary"
              >
                <span style={{ fontSize: '1.5rem' }}>📞</span>
                {status === 'permission_denied' ? 'Retry Permission' : status === 'error' ? 'Retry Call' : 'Start Demo Call'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  // State: Call Ended (Summary Screen)
  if (status === 'ended') {
    return (
        <div className="screen-center">
          <div className="card-container">
             <div className="card-header" style={{ backgroundColor: '#1e293b' }}>
                <div style={{ width: '4rem', height: '4rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1rem' }}>
                    💎
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Thank You</h2>
                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Call Summary</p>
             </div>
             
             <div className="card-body" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="contact-card">
                    <h3 style={{ color: '#1e3a8a', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Dealership Contact</h3>
                    <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>BharatDiamondConnect</div>
                    <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.25rem', marginTop: '0.25rem' }}>955 955 001</div>
                </div>

                <div>
                    <h4 style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Collected Information</h4>
                    
                    {leadData.summary && (
                      <div style={{ backgroundColor: '#f0f9ff', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#334155', borderLeft: '3px solid #3b82f6' }}>
                        {leadData.summary}
                      </div>
                    )}

                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="summary-label">Full Name</span>
                            <span className="summary-value">{leadData.fullName || 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Mobile</span>
                            <span className="summary-value">{leadData.mobile || 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Location</span>
                            <span className="summary-value">{leadData.location || 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Diamond Shape</span>
                            <span className="summary-value">{leadData.diamondShape || 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Carat Size</span>
                            <span className="summary-value">{leadData.caratSize || 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Price Range</span>
                            <span className="summary-value">{leadData.priceRange || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <button 
                  onClick={onStartCall}
                  className="btn-secondary"
                >
                  Start New Call
                </button>
             </div>
          </div>
        </div>
      );
  }

  // State: Connected (In Call)
  return (
    <div className="flex flex-col h-full phone-screen">
      {/* Background Decor */}
      <div className="background-glow"></div>

      {/* Header */}
      <div className="call-header">
         <div className="flex flex-col items-center">
            {status === 'connecting' ? (
                <span className="timer-badge" style={{ animation: 'pulse 1.5s infinite' }}>Calling...</span>
            ) : (
                <>
                    <span className="timer-badge">00:{formatTime(duration)}</span>
                    <span className="hd-badge">
                        <span className="hd-dot"></span>
                        HD Voice
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
         
         <div className="text-center">
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem', margin: 0 }}>Ananya</h1>
            <p style={{ color: '#93c5fd', fontWeight: 500, margin: 0 }}>Bharat Diamond Connect</p>
            {/* Status Indicator */}
            <p style={{ color: getStatusColor(status), fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {getStatusText(status)}
            </p>
         </div>

         {/* Audio Visualizer */}
         <div className="visualizer-container">
            {[...Array(5)].map((_, i) => (
                <div 
                    key={i} 
                    className={`visualizer-bar ${isAiSpeaking ? 'speaking' : ''}`}
                    style={{ 
                        // If not speaking, use volume for subtle movement, otherwise animation handles it
                        height: !isAiSpeaking ? `${Math.max(4, volume * 80 * (Math.random() + 0.5))}px` : undefined 
                    }}
                ></div>
            ))}
         </div>
      </div>

      {/* Controls */}
      <div className="controls-area">
         <div className="controls-row">
            {/* Mute Button (Visual only for demo) */}
            <button className="btn-control">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Z"/></svg>
            </button>

            {/* End Call */}
            <button 
                onClick={onEndCall}
                className="btn-end-call"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="currentColor"><path d="m256-120-40-120 160-200v-320h408v320L742-240 704-120H256Zm86-80h276l30-98-132-154v-320H444v320L314-298l28 98Z"/></svg>
            </button>

             {/* Keypad (Visual only) */}
             <button className="btn-control">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480ZM160-240v-480 480Z"/></svg>
            </button>
         </div>
      </div>
    </div>
  );
};