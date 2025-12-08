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
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="hero-image">
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
            
            <h1 className="brand-title">Bharat<br/>Diamond</h1>
            <div className="brand-subtitle">Private Concierge</div>

            <p style={{ color: '#a1a1aa', marginTop: '2rem', maxWidth: '280px', fontWeight: 300 }}>
              Experience AI-driven diamond sourcing. Connect with Ananya for a personalized consultation.
            </p>

            {/* Error States */}
            {status === 'error' && (
               <div style={{ marginTop: '2rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error-text)', borderRadius: '12px', fontSize: '0.8rem' }}>
                 System Temporarily Unavailable
               </div>
            )}
            {status === 'permission_denied' && (
               <div style={{ marginTop: '2rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error-text)', borderRadius: '12px', fontSize: '0.8rem' }}>
                 Microphone Access Required
               </div>
            )}
          </div>

          {/* Bottom Action */}
          <div className="w-full pt-6">
            <button onClick={onStartCall} className="btn-luxury">
              {status === 'permission_denied' ? 'Retry Access' : 'Initiate Consultation'}
            </button>
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
                cursor: 'pointer', transition: 'transform 0.2s'
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