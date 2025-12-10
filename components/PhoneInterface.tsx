import React, { useEffect, useState } from 'react';
import { ConnectionStatus, LeadData } from '../types';

interface PhoneInterfaceProps {
  status: ConnectionStatus;
  activeLanguage: string;
  isAiSpeaking: boolean;
  onStartCall: (language: string) => void;
  onEndCall: () => void;
  leadData: LeadData;
  volume: number;
}

const LANGUAGES = [
  { name: 'English', flag: '🇺🇸' },
  { name: 'Hindi', flag: '🇮🇳' },
  { name: 'Chinese', flag: '🇨🇳' },
  { name: 'Spanish', flag: '🇪🇸' },
  { name: 'German', flag: '🇩🇪' },
  { name: 'Arabic', flag: '🇦🇪' },
  { name: 'Italian', flag: '🇮🇹' },
  { name: 'French', flag: '🇫🇷' }
];

// Original Brand Logo (used on Start Screen)
const SanyaLogo = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldCoinGrad" x1="0" y1="0" x2="200" y2="200">
        <stop offset="0" stopColor="#F3E5AB" />
        <stop offset="0.3" stopColor="#D4AF37" />
        <stop offset="0.7" stopColor="#AA8C2C" />
        <stop offset="1" stopColor="#F3E5AB" />
      </linearGradient>
    </defs>
    
    <circle cx="100" cy="100" r="95" stroke="url(#goldCoinGrad)" strokeWidth="4" />
    <circle cx="100" cy="100" r="90" stroke="url(#goldCoinGrad)" strokeWidth="1" strokeDasharray="2 4"/>
    
    <g stroke="url(#goldCoinGrad)" strokeWidth="2.5" fill="none">
      <rect x="45" y="45" width="110" height="110" transform="rotate(0 100 100)" />
      <rect x="45" y="45" width="110" height="110" transform="rotate(45 100 100)" />
    </g>

    <path d="M100 65 L125 75 L135 100 L125 125 L100 135 L75 125 L65 100 L75 75 Z" fill="#111" stroke="url(#goldCoinGrad)" strokeWidth="1"/>

    <text x="100" y="120" textAnchor="middle" fill="url(#goldCoinGrad)" fontFamily="'Playfair Display', serif" fontSize="72" fontWeight="400">S</text>
  </svg>
);

// New Animated Agent Avatar (used during Call)
const AgentAvatar = ({ isSpeaking, className = "" }: { isSpeaking: boolean; className?: string }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="agentGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F3E5AB" />
        <stop offset="100%" stopColor="#D4AF37" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Outer Ring */}
    <circle cx="100" cy="100" r="98" stroke="url(#agentGrad)" strokeWidth="1" opacity="0.5" />
    
    {/* Animated Rings */}
    <circle cx="100" cy="100" r="85" stroke="url(#agentGrad)" strokeWidth="2" strokeDasharray="4 6" opacity="0.8">
      <animateTransform 
        attributeName="transform" 
        type="rotate" 
        from="0 100 100" 
        to="360 100 100" 
        dur="20s" 
        repeatCount="indefinite" 
      />
    </circle>

    {/* Abstract Head/Body Silhouette - Geometric Style */}
    <path 
      d="M100 40 C 130 40, 150 65, 150 95 C 150 135, 100 170, 100 170 C 100 170, 50 135, 50 95 C 50 65, 70 40, 100 40" 
      fill="#0a0a0a" 
      stroke="url(#agentGrad)" 
      strokeWidth="2"
    />
    
    {/* Eyes */}
    <circle cx="82" cy="85" r="3" fill="url(#agentGrad)">
       <animate attributeName="opacity" values="1;0.3;1" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="118" cy="85" r="3" fill="url(#agentGrad)">
       <animate attributeName="opacity" values="1;0.3;1" dur="4s" repeatCount="indefinite" />
    </circle>

    {/* Mouth / Voice Visualizer */}
    {isSpeaking ? (
      <g transform="translate(100, 120)">
         <path d="M-20 0 Q 0 20 20 0" stroke="url(#agentGrad)" strokeWidth="3" fill="none" strokeLinecap="round">
            <animate attributeName="d" values="M-20 0 Q 0 20 20 0; M-20 0 Q 0 5 20 0; M-20 0 Q 0 25 20 0" dur="0.3s" repeatCount="indefinite" />
         </path>
      </g>
    ) : (
      <path d="M85 120 Q 100 125 115 120" stroke="url(#agentGrad)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
    )}
    
    {/* Gem Accents */}
    <path d="M100 160 L105 150 L100 140 L95 150 Z" fill="url(#agentGrad)" opacity="0.8">
       <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
    </path>

  </svg>
);

export const PhoneInterface: React.FC<PhoneInterfaceProps> = ({
  status,
  activeLanguage,
  isAiSpeaking,
  onStartCall,
  onEndCall,
  leadData,
  volume
}) => {
  const [duration, setDuration] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    } else {
      setDuration(0);
      setShowEndConfirm(false);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
      if (status === 'connecting') return 'Connecting...';
      if (isAiSpeaking) return 'Sanya Speaking...';
      if (volume > 0.05) return 'Listening...';
      return 'Connected'; // Idle/Processing
  };

  const getLanguageFlag = (name: string) => {
      const lang = LANGUAGES.find(l => l.name === name);
      return lang ? lang.flag : '🌐';
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
               <SanyaLogo />
            </div>
            
            <h1 className="brand-title anim-fade-up">Sanya<br/>Gems</h1>
            <div className="brand-subtitle anim-fade-up" style={{ animationDelay: '0.1s' }}>Private Concierge</div>

            <p className="anim-fade-up" style={{ color: '#a1a1aa', marginTop: '1rem', maxWidth: '280px', fontWeight: 300, animationDelay: '0.2s' }}>
              Multi-lingual AI diamond sourcing.
            </p>

            {/* Language Selector */}
            <div className="anim-fade-up w-full flex justify-center mt-6" style={{ animationDelay: '0.25s' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid var(--glass-border)',
                          color: '#d4af37',
                          padding: '12px 40px 12px 20px',
                          borderRadius: '16px',
                          fontSize: '1.05rem',
                          outline: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          backdropFilter: 'blur(10px)',
                          fontFamily: 'Outfit, sans-serif',
                          appearance: 'none',
                          minWidth: '200px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                  >
                      {LANGUAGES.map(lang => (
                          <option key={lang.name} value={lang.name} style={{ background: '#1a1a1a', color: '#fff', padding: '10px' }}>
                            {lang.flag} &nbsp; {lang.name}
                          </option>
                      ))}
                  </select>
                  <div style={{ 
                      position: 'absolute', 
                      right: '16px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      pointerEvents: 'none',
                      color: '#d4af37' 
                  }}>
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
            </div>

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
            <button onClick={() => onStartCall(selectedLanguage)} className="btn-call-hero">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#000">
                  <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
               </svg>
            </button>
            <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '0.05em' }}>
              {status === 'permission_denied' ? 'Tap to Retry' : `Start Call in ${selectedLanguage}`}
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
                    <div style={{ fontSize: '1.25rem', fontFamily: 'Playfair Display', color: '#fff' }}>SanyaGems</div>
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
                 <button onClick={() => onStartCall(selectedLanguage)} className="btn-glass">
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
             <div className="flex items-center gap-3 mb-2">
                 <div className="live-indicator">
                     {status === 'connecting' ? (
                         <span style={{ color: '#d4af37' }}>Connecting...</span>
                     ) : (
                         <>
                            <span className={`live-dot ${isAiSpeaking ? 'speaking' : ''}`}></span>
                            {formatTime(duration)}
                         </>
                     )}
                 </div>
                 {/* Active Language Badge */}
                 {status === 'connected' && (
                     <div style={{ 
                         background: 'rgba(255,255,255,0.1)', 
                         padding: '6px 12px', 
                         borderRadius: '99px',
                         fontSize: '0.75rem',
                         color: '#ddd',
                         border: '1px solid rgba(255,255,255,0.1)',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '4px'
                     }}>
                        <span>{getLanguageFlag(activeLanguage)}</span>
                        <span>{activeLanguage}</span>
                     </div>
                 )}
             </div>
             
             {status === 'connected' && (
                 <div style={{ fontSize: '0.8rem', color: isAiSpeaking ? '#d4af37' : '#a1a1aa', transition: 'color 0.3s', fontWeight: 500, letterSpacing: '0.05em' }}>
                     {getStatusText()}
                 </div>
             )}
          </div>

          {/* Avatar & Visuals */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
             <div className={`avatar-ring ${isAiSpeaking ? 'speaking' : ''}`}>
                <div className="speaking-wave"></div>
                <div className="speaking-wave"></div>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #000', overflow: 'hidden' }}>
                    <AgentAvatar isSpeaking={isAiSpeaking} className="w-full h-full transform scale-90" />
                </div>
             </div>
             
             <div className="text-center mt-6">
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>Sanya</h2>
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
          <div className="w-full pb-8 flex flex-col items-center gap-4">
             
             {showEndConfirm ? (
                 <div className="anim-fade-up" style={{ background: 'rgba(20,20,20,0.9)', padding: '1rem', borderRadius: '16px', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid #333' }}>
                     <span style={{ fontSize: '0.9rem', color: '#fff' }}>End Consultation?</span>
                     <button onClick={onEndCall} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Yes</button>
                     <button onClick={() => setShowEndConfirm(false)} style={{ background: '#333', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>No</button>
                 </div>
             ) : (
                <button onClick={() => setShowEndConfirm(true)} style={{ 
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
             )}
          </div>

       </div>
    </div>
  );
};