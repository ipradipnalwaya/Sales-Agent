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
      <div className="h-full w-full relative">
        <div className="bg-ambient"></div>
        <div className="screen-container">
          
          {/* Top Branding */}
          <div className="flex-1 flex flex-col items-center pt-12 text-center">
            <div className="hero-image anim-float">
               <div className="hero-glow"></div>
               {/* Abstract Diamond Icon */}
               <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="0.5">
                 <path d="M6 3h12l4 6-10 13L2 9z" />
                 <path d="M11 3v6" />
                 <path d="M13 3v6" />
                 <path d="M2 9h20" />
                 <path d="M12 22L7 9" />
                 <path d="M12 22l5-13" />
               </svg>
            </div>
            
            <h1 className="brand-title anim-fade-up">Bharat<br/>Diamond</h1>
            <div className="brand-subtitle anim-fade-up" style={{ animationDelay: '0.1s' }}>Private Concierge</div>

            <p className="anim-fade-up" style={{ color: '#a1a1aa', marginTop: '1rem', maxWidth: '280px', fontWeight: 300, animationDelay: '0.2s' }}>
              Experience AI-driven diamond sourcing.
            </p>

            {/* Error States */}
            {status === 'error' && (
               <div className="anim-fade-up" style={{ marginTop: '2rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error-text)', borderRadius: '12px', fontSize: '0.8rem', animationDelay: '0.3s' }}>
                 System Temporarily Unavailable
               </div>
            )}
            {status === 'permission_denied' && (
               <div className="anim-fade-up" style={{ marginTop: '2rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error-text)', borderRadius: '12px', fontSize: '0.8rem', animationDelay: '0.3s' }}>
                 Microphone Access Required
               </div>
            )}
          </div>

          {/* Center Action Button */}
          <div className="w-full pb-16 flex flex-col items-center justify-center anim-fade-up" style={{ animationDelay: '0.4s' }}>
            <button onClick={onStartCall} className="btn-call-hero">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#000">
                  <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
               </svg>
            </button>
            <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '0.05em' }}>
              {status === 'permission_denied' ? 'Tap to Retry' : 'Tap to Call Ananya'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // RENDER: CALL ENDED (SUMMARY SCREEN)
  // -----------------------------------------------------------------------
  if (status === 'ended') {
    return (
        <div className="h-full w-full relative">
           <div className="bg-ambient"></div>
           <div className="screen-container">
              
              <div className="text-center pt-8 pb-6">
                 <h2 style={{ fontSize: '1.75rem', color: '#fff' }}>Consultation Report</h2>
                 <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Summary of your requirements</p>
              </div>

              <div className="flex-1 scroll-y pb-4">
                 <div className="contact-box">
                    <div style={{ color: '#d4af37', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your Dedicated Dealership</div>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'Playfair Display', color: '#fff' }}>Bharat Diamond Connect</div>
                    <div style={{ fontSize: '1.1rem', marginTop: '0.25rem', color: '#fff', fontWeight: 600 }}>955 955 001</div>
                 </div>

                 <div className="summary-card">
                    <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>Client Profile</h3>
                    <div className="detail-row">
                       <span className="detail-label">Name</span>
                       <span className="detail-value">{val(leadData.fullName)}</span>
                    </div>
                    <div className="detail-row">
                       <span className="detail-label">Mobile</span>
                       <span className="detail-value">{val(leadData.mobile)}</span>
                    </div>
                    <div className="detail-row">
                       <span className="detail-label">Location</span>
                       <span className="detail-value">{val(leadData.location)}</span>
                    </div>
                 </div>

                 <div className="summary-card">
                    <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>Requirements</h3>
                    <div className="detail-row">
                       <span className="detail-label">Shape</span>
                       <span className="detail-value">{val(leadData.diamondShape)}</span>
                    </div>
                    <div className="detail-row">
                       <span className="detail-label">Carat</span>
                       <span className="detail-value">{val(leadData.caratSize)}</span>
                    </div>
                    <div className="detail-row">
                       <span className="detail-label">Budget</span>
                       <span className="detail-value">{val(leadData.priceRange)}</span>
                    </div>
                 </div>
                 
                 {leadData.summary && (
                   <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', fontSize: '0.85rem', color: '#ccc', lineHeight: '1.6', borderLeft: '3px solid #d4af37' }}>
                      {leadData.summary}
                   </div>
                 )}
              </div>

              <div className="w-full pt-4">
                 <button onClick={onStartCall} className="btn-glass">
                    Start New Consultation
                 </button>
              </div>
           </div>
        </div>
      );
  }

  // -----------------------------------------------------------------------
  // RENDER: CONNECTED / CONNECTING (LIVE CALL)
  // -----------------------------------------------------------------------
  return (
    <div className="h-full w-full relative">
       <div className="bg-ambient"></div>
       <div className="screen-container items-center justify-between">
          
          {/* Header */}
          <div className="w-full flex flex-col items-center pt-8">
             {status === 'connecting' ? (
                <div className="live-indicator">Connecting...</div>
             ) : (
                <div className="live-indicator">
                   <span className="live-dot"></span>
                   {formatTime(duration)}
                </div>
             )}
          </div>

          {/* Avatar & Visuals */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
             <div className={`avatar-ring ${isAiSpeaking ? 'speaking' : ''}`}>
                <div className="speaking-wave"></div>
                <div className="speaking-wave"></div>
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400" 
                  alt="Ananya" 
                  className="avatar-image"
                />
             </div>
             
             <div className="text-center mt-6">
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>Ananya</h2>
                <p style={{ color: '#d4af37', fontSize: '0.85rem', letterSpacing: '0.1em', marginTop: '0.5rem', textTransform: 'uppercase' }}>
                   AI Sales Executive
                </p>
             </div>

             {/* Minimalist Visualizer */}
             <div className={`visualizer ${isAiSpeaking ? 'speaking' : ''}`}>
                 <div className="v-bar" style={{ height: !isAiSpeaking ? `${Math.max(4, volume * 100)}px` : undefined }}></div>
                 <div className="v-bar" style={{ height: !isAiSpeaking ? `${Math.max(4, volume * 80)}px` : undefined }}></div>
                 <div className="v-bar" style={{ height: !isAiSpeaking ? `${Math.max(4, volume * 120)}px` : undefined }}></div>
                 <div className="v-bar" style={{ height: !isAiSpeaking ? `${Math.max(4, volume * 90)}px` : undefined }}></div>
                 <div className="v-bar" style={{ height: !isAiSpeaking ? `${Math.max(4, volume * 60)}px` : undefined }}></div>
             </div>
          </div>

          {/* Controls */}
          <div className="w-full pb-8 flex justify-center gap-6">
             <button onClick={onEndCall} style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                background: '#ef4444', border: 'none', color: 'white',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'transform 0.2s',
                pointerEvents: 'auto', zIndex: 50
             }}>
                <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="currentColor">
                   <path d="m256-120-40-120 160-200v-320h408v320L742-240 704-120H256Zm86-80h276l30-98-132-154v-320H444v320L314-298l28 98Z"/>
                </svg>
             </button>
          </div>

       </div>
    </div>
  );
};