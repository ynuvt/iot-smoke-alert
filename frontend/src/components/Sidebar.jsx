import React, { useState } from 'react';
import { HelpCircle, RefreshCw, AlertTriangle, Send } from 'lucide-react';

export default function Sidebar({ selectedSensor, sensorHistory, backendUrl, onUpdateTelemetry, onClearAlert }) {
  const [customSmoke, setCustomSmoke] = useState('');
  const [loading, setLoading] = useState(false);

  if (!selectedSensor) {
    return (
      <div className="sidebar glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', gap: '12px' }}>
          <HelpCircle size={48} strokeWidth={1.5} />
          <h3 style={{ color: 'var(--text-secondary)' }}>No Sensor Selected</h3>
          <p style={{ fontSize: '13px' }}>Click on a 3D sensor node or room in the building model to view live telemetry, trigger simulation, and view history.</p>
        </div>
      </div>
    );
  }

  const handleSimulate = async (value) => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/sensors/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensorId: selectedSensor.sensorId,
          smokeLevel: Number(value),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update telemetry');
      }

      if (onUpdateTelemetry) {
        onUpdateTelemetry();
      }
    } catch (err) {
      console.error('Error simulating telemetry:', err);
      alert('Error updating sensor status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ALERT': return 'badge-alert';
      case 'WARNING': return 'badge-warning';
      default: return 'badge-safe';
    }
  };

  // Filter history logs specific to this sensor
  const specificLogs = sensorHistory.filter(log => log.sensorId === selectedSensor.sensorId);

  return (
    <div className="sidebar glass-panel">
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>Sensor Control</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Room Telemetry Details
        </p>
      </div>

      <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

      {/* Sensor Metadata */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sensor ID</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{selectedSensor.sensorId}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Room Location</span>
          <span>{selectedSensor.roomName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Floor Level</span>
          <span>{selectedSensor.floor}F</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Current Status</span>
          <span className={`badge ${getStatusClass(selectedSensor.status)}`}>
            {selectedSensor.status}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Smoke Level</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: selectedSensor.status === 'ALERT' ? 'var(--color-alert)' : selectedSensor.status === 'WARNING' ? 'var(--color-warning)' : 'var(--color-safe)' }}>
            {selectedSensor.smokeLevel} ppm
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Last Synchronization:</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {selectedSensor.lastUpdated ? new Date(selectedSensor.lastUpdated).toLocaleString() : 'N/A'}
          </span>
        </div>
        
        {selectedSensor.status === 'ALERT' && (
          <button 
            onClick={() => onClearAlert(selectedSensor.sensorId)}
            className="btn-primary"
            style={{ 
              width: '100%', 
              marginTop: '8px', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' 
            }}
          >
            Clear / Resolve Alert
          </button>
        )}
      </div>

      <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

      {/* Simulator Interface */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          <span>Local IoT Simulation</span>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            disabled={loading}
            onClick={() => handleSimulate(15)} 
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px' }}
          >
            Simulate Safe Mode (15 ppm)
          </button>
          <button 
            disabled={loading}
            onClick={() => handleSimulate(120)} 
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px', borderLeft: '3px solid var(--color-warning)' }}
          >
            Simulate Gas Warning (120 ppm)
          </button>
          <button 
            disabled={loading}
            onClick={() => handleSimulate(420)} 
            className="btn-danger"
            style={{ fontSize: '13px', padding: '8px' }}
          >
            Simulate Smoke Fire (420 ppm)
          </button>

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <input 
              type="number"
              placeholder="Custom smoke value"
              value={customSmoke}
              onChange={(e) => setCustomSmoke(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button 
              disabled={loading || !customSmoke}
              onClick={() => { handleSimulate(customSmoke); setCustomSmoke(''); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Send size={14} style={{ color: 'white' }} />
            </button>
          </div>
        </div>
      </div>

      <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

      {/* Sensor Logs */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={16} />
          <span>Room Alert Log ({specificLogs.length})</span>
        </h3>
        
        <div className="logs-list" style={{ flex: 1 }}>
          {specificLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              No recorded alerts for this sensor.
            </div>
          ) : (
            specificLogs.map((log, index) => (
              <div key={index} className="log-item log-alert">
                <div className="log-header">
                  <span>SMOKE DETECTED</span>
                  <span>{log.smokeLevel} ppm</span>
                </div>
                <div className="log-time">
                  Triggered: {new Date(log.timestamp).toLocaleString()}
                </div>
                {log.resolvedAt && (
                  <div className="log-time" style={{ color: 'var(--color-safe)' }}>
                    Resolved: {new Date(log.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
