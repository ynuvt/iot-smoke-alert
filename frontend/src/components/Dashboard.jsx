import React, { useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Wifi, HardDrive, RefreshCw } from 'lucide-react';

export default function Dashboard({ 
  sensors, 
  sensorHistory, 
  isConnected, 
  dbStatus, 
  backendUrl, 
  onResetSystem, 
  selectedSensor, 
  onSelectSensor 
}) {
  const [resetting, setResetting] = useState(false);

  // Stats calculation
  const totalSensors = sensors.length;
  const activeAlerts = sensors.filter(s => s.status === 'ALERT');
  const activeWarnings = sensors.filter(s => s.status === 'WARNING');
  const safeCount = totalSensors - activeAlerts.length - activeWarnings.length;

  let buildingHealth = 100;
  if (totalSensors > 0) {
    // Alerts reduce health by 30% each, warnings by 10%
    buildingHealth = Math.max(0, 100 - (activeAlerts.length * 30) - (activeWarnings.length * 10));
  }

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch(`${backendUrl}/api/sensors/reset`, { method: 'POST' });
      if (res.ok) {
        if (onResetSystem) onResetSystem();
      }
    } catch (err) {
      console.error('Failed to reset system:', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="dashboard-left">
      {/* Title Panel */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity style={{ color: 'var(--color-safe)' }} />
          <span>AetherTwin 3D</span>
        </h1>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
          Smart IoT Building Digital Twin
        </span>
      </div>

      {/* Network / Connection Stats */}
      <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <Wifi size={14} style={{ color: isConnected ? 'var(--color-safe)' : 'var(--color-alert)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>WS server:</span>
          <span style={{ fontWeight: 'bold' }}>{isConnected ? 'Online' : 'Offline'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <HardDrive size={14} style={{ color: dbStatus.includes('Connected') ? 'var(--color-safe)' : 'var(--color-warning)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Database:</span>
          <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{dbStatus}</span>
        </div>
      </div>

      {/* Building Summary */}
      <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Building Health Index
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: buildingHealth > 70 ? 'var(--color-safe)' : buildingHealth > 40 ? 'var(--color-warning)' : 'var(--color-alert)' }}>
              {buildingHealth}%
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Operational</span>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <label>Safe Zones</label>
            <span style={{ color: 'var(--color-safe)' }}>{safeCount}</span>
          </div>
          <div className="metric-card">
            <label>Active Alarms</label>
            <span style={{ color: activeAlerts.length > 0 ? 'var(--color-alert)' : 'var(--text-secondary)' }}>
              {activeAlerts.length}
            </span>
          </div>
        </div>

        {activeAlerts.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--color-alert)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.4' }}>
              Warning: Smoke sensor active in {activeAlerts.map(a => a.roomName).join(', ')}. Run checks.
            </span>
          </div>
        )}

        <button 
          onClick={handleReset} 
          disabled={resetting}
          className="btn-secondary"
          style={{ width: '100%', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
        >
          <RefreshCw size={14} className={resetting ? 'spin-icon' : ''} />
          <span>Reset All Sensors</span>
        </button>
      </div>

      {/* Sensor List */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: '240px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Sensors Directory ({totalSensors})
        </h2>
        
        <div className="logs-list" style={{ flex: 1 }}>
          {sensors.map((sensor) => {
            const isSelected = selectedSensor && selectedSensor.sensorId === sensor.sensorId;
            return (
              <div 
                key={sensor.sensorId} 
                onClick={() => onSelectSensor(sensor)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>{sensor.roomName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sensor.sensorId} • Floor {sensor.floor}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{sensor.smokeLevel} ppm</span>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: sensor.status === 'ALERT' ? 'var(--color-alert)' : sensor.status === 'WARNING' ? 'var(--color-warning)' : 'var(--color-safe)',
                    boxShadow: sensor.status === 'ALERT' ? '0 0 8px var(--color-alert)' : 'none'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Alerts Feed */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: '200px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Recent Building Events
        </h2>
        
        <div className="logs-list" style={{ flex: 1 }}>
          {sensorHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              No system events recorded.
            </div>
          ) : (
            sensorHistory.map((log, index) => (
              <div key={index} className={`log-item ${log.status === 'ALERT' ? 'log-alert' : 'log-warning'}`}>
                <div className="log-header">
                  <span>{log.roomName} ({log.sensorId})</span>
                  <span>{log.smokeLevel} ppm</span>
                </div>
                <div className="log-time" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Event: {log.status}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
