import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Building3D from './components/Building3D';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [showGuide, setShowGuide] = useState(true);

  // Fetch initial system state
  const fetchInitialData = async () => {
    try {
      // 1. Fetch current sensors status
      const sensorsRes = await fetch(`${BACKEND_URL}/api/sensors`);
      if (sensorsRes.ok) {
        const sensorsData = await sensorsRes.json();
        setSensors(sensorsData);
        
        // Update selected sensor ref to keep values synced if already selected
        if (selectedSensor) {
          const updated = sensorsData.find(s => s.sensorId === selectedSensor.sensorId);
          if (updated) setSelectedSensor(updated);
        }
      }

      // 2. Fetch history alert logs
      const alertsRes = await fetch(`${BACKEND_URL}/api/alerts`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setSensorHistory(alertsData);
      }

      // 3. Fetch server health (db state)
      const healthRes = await fetch(`${BACKEND_URL}/api/health`);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setDbStatus(healthData.database);
      }
    } catch (err) {
      console.error('Error fetching initial server state:', err);
      setDbStatus('Offline');
    }
  };

  // Clear a latched ALERT status manually
  const handleClearAlert = async (sensorId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sensors/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensorId })
      });
      if (res.ok) {
        // Re-fetch data to sync frontend status immediately
        await fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to clear sensor alert:', err);
    }
  };

  useEffect(() => {
    // Perform initial data fetch
    fetchInitialData();

    // Connect to backend Socket.IO websocket
    const socket = io(BACKEND_URL);

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle real-time sensor updates
    socket.on('sensor-update', (updatedSensor) => {
      setSensors((prevSensors) =>
        prevSensors.map((sensor) =>
          sensor.sensorId === updatedSensor.sensorId ? updatedSensor : sensor
        )
      );

      // Sync active selection detail panel
      setSelectedSensor((prevSelected) => {
        if (prevSelected && prevSelected.sensorId === updatedSensor.sensorId) {
          return updatedSensor;
        }
        return prevSelected;
      });
    });

    // Handle new incident alarms
    socket.on('new-alert', (newAlert) => {
      setSensorHistory((prevHistory) => [newAlert, ...prevHistory]);
    });

    // Handle warning indicator triggers
    socket.on('status-warning', (warningInfo) => {
      console.warn(`[System Notification] Sensor ${warningInfo.sensorId} reading warning levels: ${warningInfo.smokeLevel} ppm.`);
    });

    // Handle system resets
    socket.on('system-reset', (resetSensors) => {
      setSensors(resetSensors);
      setSelectedSensor((prevSelected) => {
        if (prevSelected) {
          const resetMatch = resetSensors.find(s => s.sensorId === prevSelected.sensorId);
          return resetMatch || null;
        }
        return null;
      });
      // Re-fetch alerts to synchronize resolution logs
      fetchInitialData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Compute active critical emergency alerts
  const activeAlerts = sensors.filter((s) => s.status === 'ALERT');

  return (
    <div className="app-container">
      {/* Top Banner for critical fire warnings */}
      <AlertBanner activeAlerts={activeAlerts} onClearAlert={handleClearAlert} />

      <div 
        className="main-content"
        style={{ 
          paddingTop: activeAlerts.length > 0 ? '56px' : '0px',
          transition: 'padding-top 0.3s ease-out'
        }}
      >
        {/* Left Side Dashboard panel */}
        <Dashboard
          sensors={sensors}
          sensorHistory={sensorHistory}
          isConnected={isConnected}
          dbStatus={dbStatus}
          backendUrl={BACKEND_URL}
          onResetSystem={fetchInitialData}
          selectedSensor={selectedSensor}
          onSelectSensor={setSelectedSensor}
        />

        {/* Center 3D Digital Twin building renderer */}
        <Building3D
          sensors={sensors}
          selectedSensor={selectedSensor}
          onSelectSensor={setSelectedSensor}
          showGuide={showGuide}
          setShowGuide={setShowGuide}
        />

        {/* Right Side Sensor Control & Simulation panel */}
        <Sidebar
          selectedSensor={selectedSensor}
          sensorHistory={sensorHistory}
          backendUrl={BACKEND_URL}
          onUpdateTelemetry={fetchInitialData}
          onClearAlert={handleClearAlert}
        />
      </div>
    </div>
  );
}
