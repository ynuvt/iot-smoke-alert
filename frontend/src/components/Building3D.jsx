import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { X } from 'lucide-react';

// Custom Smoke Particle Effect component using useFrame for custom upward animation
function SmokeParticles({ count = 60, roomWidth = 2.4, roomHeight = 1.4, roomDepth = 2.0 }) {
  const points = useRef();

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * roomWidth;
      pos[i * 3 + 1] = (Math.random() - 0.5) * roomHeight;
      pos[i * 3 + 2] = (Math.random() - 0.5) * roomDepth;
      spds[i] = 0.008 + Math.random() * 0.015;
    }
    return [pos, spds];
  }, [count, roomWidth, roomHeight, roomDepth]);

  useFrame(() => {
    if (!points.current) return;
    const geo = points.current.geometry;
    const array = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      // Move up
      array[i * 3 + 1] += speeds[i];
      // Reset to bottom if goes above ceiling
      const ceiling = roomHeight / 2;
      if (array[i * 3 + 1] > ceiling) {
        array[i * 3 + 1] = -roomHeight / 2;
        array[i * 3] = (Math.random() - 0.5) * roomWidth;
        array[i * 3 + 2] = (Math.random() - 0.5) * roomDepth;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ff4444"
        size={0.15}
        transparent
        opacity={0.65}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Interactive Room component
function Room({ sensor, isSelected, onSelect }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Position coordinates for classroom nodes stacked vertically in the 6-floor tower
  // Y coordinates are spaced by 1.5 units:
  // Floor 1 (Ground): Y = -2.25
  // Floor 2: Y = -0.75
  // Floor 3: Y = 0.75
  // Floor 6: Y = 5.25
  const position = useMemo(() => {
    let y = -2.25; // default Ground Floor (1F)
    if (sensor.floor === 2) y = -0.75;
    else if (sensor.floor === 3) y = 0.75;
    else if (sensor.floor === 6) y = 5.25;

    return [0, y, 0];
  }, [sensor.floor]);

  // Determine colors based on state
  const colors = useMemo(() => {
    if (sensor.status === 'ALERT') {
      return {
        roomBg: '#ef4444',
        roomOpacity: 0.25,
        wireframe: '#ef4444',
        sensor: '#ff3333',
        sensorGlow: '#ff5555'
      };
    }
    if (sensor.status === 'WARNING') {
      return {
        roomBg: '#f59e0b',
        roomOpacity: 0.18,
        wireframe: '#f59e0b',
        sensor: '#f59e0b',
        sensorGlow: '#fbbf24'
      };
    }
    // Safe
    return {
      roomBg: isSelected ? '#38bdf8' : '#0369a1',
      roomOpacity: isSelected ? 0.15 : hovered ? 0.08 : 0.03,
      wireframe: isSelected ? '#38bdf8' : hovered ? '#0ea5e9' : '#0284c7',
      sensor: '#10b981',
      sensorGlow: '#34d399'
    };
  }, [sensor.status, isSelected, hovered]);

  // Pulsing animation for active warning/alert sensors
  const sensorRef = useRef();
  useFrame(({ clock }) => {
    if (!sensorRef.current) return;
    const elapsed = clock.getElapsedTime();
    if (sensor.status === 'ALERT') {
      // Pulse scale rapidly
      const scale = 1 + Math.sin(elapsed * 10) * 0.25;
      sensorRef.current.scale.set(scale, scale, scale);
    } else if (sensor.status === 'WARNING') {
      // Pulse scale slowly
      const scale = 1 + Math.sin(elapsed * 4) * 0.12;
      sensorRef.current.scale.set(scale, scale, scale);
    } else {
      sensorRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group position={position}>
      {/* Semi-transparent Room Box */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sensor);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <boxGeometry args={[2.4, 1.4, 2.0]} />
        <meshStandardMaterial
          color={colors.roomBg}
          transparent
          opacity={colors.roomOpacity}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe Room Edges for high-tech architectural blueprint feel */}
      <mesh>
        <boxGeometry args={[2.41, 1.41, 2.01]} />
        <meshBasicMaterial
          color={colors.wireframe}
          wireframe
          transparent
          opacity={sensor.status === 'ALERT' ? 0.8 : isSelected ? 0.9 : 0.3}
        />
      </mesh>

      {/* Glowing Sensor Spherical Node */}
      <mesh 
        ref={sensorRef}
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sensor);
        }}
      >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={colors.sensor}
          emissive={colors.sensor}
          emissiveIntensity={sensor.status === 'ALERT' ? 2.5 : sensor.status === 'WARNING' ? 1.5 : 0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Sensor ID Tag (HTML Overlay) */}
      <Html distanceFactor={6} position={[0, 0.7, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: `1px solid ${colors.wireframe}`,
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '9px',
          fontWeight: '600',
          fontFamily: 'monospace',
          color: 'white',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          opacity: isSelected || hovered || sensor.status !== 'SAFE' ? 1 : 0.4,
          transition: 'all 0.2s'
        }}>
          {sensor.roomName}
        </div>
      </Html>

      {/* Rising Smoke Particles when ALERT */}
      {sensor.status === 'ALERT' && (
        <SmokeParticles roomWidth={2.2} roomHeight={1.2} roomDepth={1.8} />
      )}
    </group>
  );
}

// Grid Ground Plane
function GroundGrid() {
  return (
    <group position={[0, -3.1, 0]}>
      {/* Circular base stand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.5, 0.15, 64]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} metalness={0.1} />
      </mesh>
      <gridHelper args={[8, 16, '#0ea5e9', '#cbd5e1']} position={[0, 0.08, 0]} />
    </group>
  );
}

// Columns and Structural Beams for the architectural layout (6-floor tower)
function BuildingStructure() {
  // Slabs at Ground, 2nd, 3rd, 4th, 5th, 6th, and Roof
  const floorSlabs = [-2.96, -1.46, 0.04, 1.54, 3.04, 4.54, 6.04];
  
  return (
    <group>
      {/* Vertical Columns (x4 corners) */}
      {/* Centered at 1.54 Y, height is 9.0 (from -2.96 to 6.04) */}
      {[-1.5, 1.5].map((x) => 
        [-1.3, 1.3].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 1.54, z]}>
            <cylinderGeometry args={[0.04, 0.04, 9.0, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.4} transparent opacity={0.7} />
          </mesh>
        ))
      )}

      {/* Floor Horizontal Slabs */}
      {floorSlabs.map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, 2.8]} />
          <meshStandardMaterial 
            color="#94a3b8" 
            transparent 
            opacity={idx === 0 || idx === 6 ? 0.35 : 0.15} 
            side={THREE.DoubleSide}
            wireframe={idx === 6} // wireframe roof
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Building3D({ sensors, selectedSensor, onSelectSensor, showGuide, setShowGuide }) {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [9, 4, 10], fov: 45 }}
        shadows
      >
        <color attach="background" args={['#f8fafc']} />
        
        {/* Lights */}
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[6, 12, 4]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        <pointLight position={[-6, 4, -4]} intensity={0.4} color="#0ea5e9" />

        {/* 3D Elements */}
        <group position={[0, -1.0, 0]}>
          <BuildingStructure />
          
          {sensors.map((sensor) => (
            <Room
              key={sensor.sensorId}
              sensor={sensor}
              isSelected={selectedSensor && selectedSensor.sensorId === sensor.sensorId}
              onSelect={onSelectSensor}
            />
          ))}
          
          <GroundGrid />
        </group>

        {/* Controls */}
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 + 0.15} // Prevent going underground
          minDistance={3}
          maxDistance={20}
        />
      </Canvas>

      {/* Guide overlay with close button */}
      {showGuide && (
        <div className="guide-box glass-panel">
          <button className="close-btn" onClick={() => setShowGuide(false)} title="Dismiss Guide">
            <X size={14} />
          </button>
          <h4>Interactive Viewport</h4>
          <span>• Left Click + Drag to rotate model</span>
          <span>• Right Click + Drag to pan</span>
          <span>• Scroll to zoom in/out</span>
          <span>• Click nodes to select sensors</span>
        </div>
      )}
    </div>
  );
}
