import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Volume2, VolumeX } from 'lucide-react';

export default function AlertBanner({ activeAlerts, onClearAlert }) {
  const [muted, setMuted] = useState(true);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const intervalRef = useRef(null);

  const hasAlerts = activeAlerts && activeAlerts.length > 0;
  const currentAlert = hasAlerts ? activeAlerts[0] : null;

  // Initialize Web Audio API on click/unmute
  const toggleMute = () => {
    if (muted) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      setMuted(false);
    } else {
      stopBuzzer();
      setMuted(true);
    }
  };

  const startBuzzer = () => {
    if (muted || !audioCtxRef.current) return;
    
    // Resume context if suspended (browser security)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    // Stop any existing intervals
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Beep pattern: beep for 0.15s, pause 0.3s
    intervalRef.current = setInterval(() => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        
        const osc = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5 note
        
        gainNode.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.15);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.15);
      } catch (err) {
        console.error('Audio synthesis failed:', err);
      }
    }, 450);
  };

  const stopBuzzer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // React to alerts changing
  useEffect(() => {
    if (hasAlerts && !muted) {
      startBuzzer();
    } else {
      stopBuzzer();
    }

    return () => stopBuzzer();
  }, [hasAlerts, muted]);

  if (!hasAlerts || !currentAlert) return null;

  return (
    <div className="emergency-banner">
      <h3>
        <ShieldAlert size={22} className="alert-pulse-icon" />
        <span>EMERGENCY: Active Smoke Alarm in {currentAlert.roomName} (Floor {currentAlert.floor})!</span>
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
          Smoke: {currentAlert.smokeLevel} ppm
        </span>
        <button 
          onClick={toggleMute}
          style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            border: 'none', 
            color: 'white', 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0
          }}
          title={muted ? "Unmute Alarm Sound" : "Mute Alarm Sound"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button onClick={() => onClearAlert(currentAlert.sensorId)}>
          Clear Alert
        </button>
        <span style={{ fontWeight: '600', fontSize: '12px' }}>Evacuation Advised</span>
      </div>
    </div>
  );
}
