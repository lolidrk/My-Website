import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, User, Home, Navigation2, MapPin, Layers, Compass } from 'lucide-react';
import * as THREE from 'three';

// --- Configuration Constants ---
const DESTINATIONS = [
  { 
    id: 'home', 
    name: 'Home Base', 
    icon: Home, 
    coords: { lat: 12.9698, lng: 77.7500 },
    position3D: { x: 0, z: 0 },
    color: '#3b82f6',
    buildingColor: 0x3b82f6,
    height: 8
  },
  { 
    id: 'publications', 
    name: 'Publications Hub', 
    icon: FileText, 
    coords: { lat: 12.9850, lng: 77.7300 },
    position3D: { x: -50, z: -50 },
    color: '#10b981',
    buildingColor: 0x10b981,
    height: 15
  },
  { 
    id: 'blog', 
    name: 'Blog Tower', 
    icon: BookOpen, 
    coords: { lat: 12.9520, lng: 77.7650 },
    position3D: { x: 50, z: 50 },
    color: '#f59e0b',
    buildingColor: 0xf59e0b,
    height: 12
  },
  { 
    id: 'about', 
    name: 'About Plaza', 
    icon: User, 
    coords: { lat: 12.9600, lng: 77.7400 },
    position3D: { x: -40, z: 40 },
    color: '#8b5cf6',
    buildingColor: 0x8b5cf6,
    height: 10
  },
];

const ROADS = [
  { from: { x: 0, z: 0 }, to: { x: -50, z: -50 } },
  { from: { x: 0, z: 0 }, to: { x: 50, z: 50 } },
  { from: { x: 0, z: 0 }, to: { x: -40, z: 40 } },
  { from: { x: -50, z: -50 }, to: { x: 50, z: 50 } },
  { from: { x: 50, z: 50 }, to: { x: -40, z: 40 } },
  { from: { x: -40, z: 40 }, to: { x: -50, z: -50 } },
];

// --- Vector Map Component ---
const VectorMap = ({ currentPosition, destinations, roads, isNavigating, navigationProgress, currentRoute }) => {
  const viewBoxSize = 140; 
  const offset = viewBoxSize / 2;

  // Calculate dynamic car position for the 2D map
  const getCarPosition = () => {
    if (!isNavigating || !currentRoute.path || currentRoute.path.length === 0) {
        // If parked, show at the parking spot (z + 8 relative to building)
        return { 
            x: currentPosition.position3D.x, 
            z: currentPosition.position3D.z + 8 
        };
    }
    
    // Map the current route segment to the 2D view
    const totalSegments = currentRoute.path.length - 1;
    const progressPerSegment = 1 / totalSegments;
    const currentSegmentIndex = Math.min(
        Math.floor(navigationProgress / progressPerSegment),
        totalSegments - 1
    );
    const segmentProgress = (navigationProgress - (currentSegmentIndex * progressPerSegment)) / progressPerSegment;

    const p1 = currentRoute.path[currentSegmentIndex];
    const p2 = currentRoute.path[currentSegmentIndex + 1];

    if (!p1 || !p2) return currentPosition.position3D;

    return {
        x: p1.x + (p2.x - p1.x) * segmentProgress,
        z: p1.z + (p2.z - p1.z) * segmentProgress
    };
  };

  const carPos = getCarPosition();

  // Simple rotation logic for the puck
  let rotation = 0;
  if (isNavigating && currentRoute.path.length > 0) {
      // Find current segment
      const totalSegments = currentRoute.path.length - 1;
      const progressPerSegment = 1 / totalSegments;
      const idx = Math.min(Math.floor(navigationProgress / progressPerSegment), totalSegments - 1);
      const p1 = currentRoute.path[idx];
      const p2 = currentRoute.path[idx+1];
      if(p1 && p2) {
          rotation = Math.atan2(p2.x - p1.x, p2.z - p1.z) * (180 / Math.PI);
      }
  }

  return (
    <div className="w-full h-full bg-[#0f1419] relative overflow-hidden select-none border-t border-slate-800">
      {/* Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#4a5568" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Main Map Content */}
      <svg 
        viewBox={`-${offset} -${offset} ${viewBoxSize} ${viewBoxSize}`} 
        className="w-full h-full"
        style={{ padding: '20px' }}
      >
        {/* Roads */}
        {roads.map((road, i) => (
          <g key={i}>
            <line x1={road.from.x} y1={road.from.z} x2={road.to.x} y2={road.to.z}
              stroke="#2d3748" strokeWidth="6" strokeLinecap="round" />
            <line x1={road.from.x} y1={road.from.z} x2={road.to.x} y2={road.to.z}
              stroke="#4a5568" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}

        {/* Destination Zones */}
        {destinations.map(dest => (
          <g key={dest.id} transform={`translate(${dest.position3D.x}, ${dest.position3D.z})`}>
            {/* Connection to parking */}
            <line x1="0" y1="0" x2="0" y2="8" stroke="#333" strokeWidth="2" />
            
            {/* Building Marker */}
            <rect x="-4" y="-4" width="8" height="8" fill={dest.color} rx="2" stroke="#1a1a1a" strokeWidth="1"/>
            
            {/* Label */}
            <text y="-7" textAnchor="middle" fill="#94a3b8" fontSize="4" fontWeight="600" style={{ textShadow: '0px 1px 2px black' }}>
              {dest.name}
            </text>
          </g>
        ))}

        {/* The Car / User Position */}
        <g transform={`translate(${carPos.x}, ${carPos.z}) rotate(${rotation})`}>
          <path d="M 0 0 L -6 20 L 6 20 Z" fill="url(#gradient)" opacity="0.4" />
          <defs>
             <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
               <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
               <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
             </linearGradient>
          </defs>
          <circle r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
        </g>
      </svg>
      
      <div className="absolute bottom-4 right-4 flex gap-2">
        <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-lg text-white opacity-80">
          <Compass size={16} />
        </div>
      </div>
    </div>
  );
};


const AutonomousBlog = () => {
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [currentRoute, setCurrentRoute] = useState({path: []});
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const carRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingsRef = useRef([]);

  const [currentPosition, setCurrentPosition] = useState(DESTINATIONS[0]);

  // --- Three.js Setup ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 80, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 300);
    camera.position.set(0, 15, 25); // Higher angle for better view
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(800, 500);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a15, 1);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0f1419,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(300, 60, 0x1a4d6f, 0x0d2433);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Roads
    const roadWidth = 6;
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });

    ROADS.forEach(road => {
      const dx = road.to.x - road.from.x;
      const dz = road.to.z - road.from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, length), roadMaterial);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -angle;
      roadMesh.position.set((road.from.x + road.to.x)/2, 0.02, (road.from.z + road.to.z)/2);
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);

      // Road Markings
      const segments = Math.floor(length / 6);
      for(let i=0; i<segments; i++) {
          const t = i/segments;
          const mark = new THREE.Mesh(
              new THREE.PlaneGeometry(0.3, 3), 
              new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8})
          );
          mark.rotation.x = -Math.PI/2;
          mark.rotation.z = -angle;
          mark.position.set(road.from.x + dx*t, 0.03, road.from.z + dz*t);
          scene.add(mark);
      }
    });

    // Buildings
    DESTINATIONS.forEach(dest => {
      const group = new THREE.Group();
      
      // Main Building
      const bGeo = new THREE.BoxGeometry(8, dest.height, 8);
      const bMat = new THREE.MeshStandardMaterial({ color: dest.buildingColor, roughness: 0.7 });
      const building = new THREE.Mesh(bGeo, bMat);
      building.position.y = dest.height / 2;
      building.castShadow = true;
      group.add(building);

      // Simple Windows
      for(let i=0; i<4; i++) {
          const w = new THREE.Mesh(
              new THREE.BoxGeometry(0.6, 0.6, 0.1),
              new THREE.MeshStandardMaterial({color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.5})
          );
          w.position.set(2, dest.height - 3 - (i*2), 4.05);
          group.add(w);
      }

      // Parking Spot (Important for navigation logic)
      const pGeo = new THREE.PlaneGeometry(3, 5);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
      const parking = new THREE.Mesh(pGeo, pMat);
      parking.rotation.x = -Math.PI / 2;
      parking.position.set(0, 0.02, 8); // Parking is always at Z+8 relative to building
      group.add(parking);

      // Connect parking to road visual
      const connGeo = new THREE.PlaneGeometry(3, 3);
      const conn = new THREE.Mesh(connGeo, pMat);
      conn.rotation.x = -Math.PI/2;
      conn.position.set(0, 0.02, 5);
      group.add(conn);

      group.position.set(dest.position3D.x, 0, dest.position3D.z);
      scene.add(group);
      buildingsRef.current.push(group);
    });

    // Car
    const car = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a4d8f, metalness: 0.8 })
    );
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.7, 2),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    cabin.position.y = 1.15;
    cabin.position.z = -0.5;
    car.add(cabin);

    // Initial Position (Parked at Home)
    // Home is (0,0), Parking is at (0,8)
    car.position.set(0, 0.1, 8); 
    carRef.current = car;
    scene.add(car);

    // Render Loop
    let frame = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      frame++;
      
      if (!isNavigating && carRef.current) {
        // Subtle hover effect when parked
        carRef.current.position.y = 0.1 + Math.sin(frame * 0.02) * 0.02;
      } else if (carRef.current) {
        // Stable on ground when driving
        carRef.current.position.y = 0.1;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => renderer.dispose();
  }, []);

  // --- Improved Navigation Logic ---
  // Calculates a strictly valid road path: Parking -> Hub -> Road -> Hub -> Parking
  const navigateTo = (destination) => {
    if (isNavigating || currentPosition.id === destination.id) return;

    // 1. Start Point: Current Parking Spot
    const startPos = { 
        x: currentPosition.position3D.x, 
        z: currentPosition.position3D.z + 8 
    };

    // 2. Start Hub: The "driveway" exit
    const startHub = {
        x: currentPosition.position3D.x,
        z: currentPosition.position3D.z
    };

    // 3. End Hub: The destination "driveway" entrance
    const endHub = {
        x: destination.position3D.x,
        z: destination.position3D.z
    };

    // 4. End Point: The destination Parking Spot
    const endPos = {
        x: destination.position3D.x,
        z: destination.position3D.z + 8
    };

    // Build the path sequence
    // Note: Since our road network is fully connected (K4 graph), we can drive directly between hubs
    const routePath = [
        startPos,   // 0. Start at parking
        startHub,   // 1. Pull out to main node
        endHub,     // 2. Drive to destination node
        endPos      // 3. Pull into parking
    ];

    setCurrentRoute({ path: routePath, destination });
    setIsNavigating(true);
    setCurrentPosition(destination);
  };

  // --- Animation Loop for Movement ---
  useEffect(() => {
    if (!isNavigating || currentRoute.path.length === 0) return;

    const SPEED = 0.4; // Units per frame approx
    const ROTATION_SPEED = 0.1;
    let currentSegmentIndex = 0;
    let animId;

    const animateMovement = () => {
        if (!carRef.current) return;
        
        const path = currentRoute.path;
        if (currentSegmentIndex >= path.length - 1) {
            // Reached the end
            setIsNavigating(false);
            setTimeout(() => setSelectedDestination(currentRoute.destination), 500);
            return;
        }

        const target = path[currentSegmentIndex + 1];
        const current = carRef.current.position;

        // 1. Calculate direction to target
        const dx = target.x - current.x;
        const dz = target.z - current.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        // 2. Determine target angle
        const targetRotation = Math.atan2(dx, dz);
        
        // 3. Smoothly rotate car towards target
        let rotDiff = targetRotation - carRef.current.rotation.y;
        // Normalize angle to -PI to PI
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        
        carRef.current.rotation.y += rotDiff * ROTATION_SPEED;

        // 4. Move car forward if aligned (or mostly aligned)
        if (Math.abs(rotDiff) < 0.5) {
            const moveStep = Math.min(SPEED, dist);
            carRef.current.position.x += (dx / dist) * moveStep;
            carRef.current.position.z += (dz / dist) * moveStep;

            // Update global progress for the map
            const totalSegments = path.length - 1;
            const segmentProgress = 1 - (dist / Math.sqrt(
                Math.pow(path[currentSegmentIndex+1].x - path[currentSegmentIndex].x, 2) +
                Math.pow(path[currentSegmentIndex+1].z - path[currentSegmentIndex].z, 2)
            ));
            
            setNavigationProgress(
                (currentSegmentIndex + segmentProgress) / totalSegments
            );

            // Check if we reached the waypoint
            if (dist < 0.5) {
                currentSegmentIndex++;
            }
        }

        // Camera Follow Logic
        if (cameraRef.current) {
            cameraRef.current.position.x += (carRef.current.position.x - cameraRef.current.position.x) * 0.05;
            cameraRef.current.position.z += (carRef.current.position.z + 20 - cameraRef.current.position.z) * 0.05;
            cameraRef.current.lookAt(carRef.current.position);
        }

        animId = requestAnimationFrame(animateMovement);
    };

    animId = requestAnimationFrame(animateMovement);
    return () => cancelAnimationFrame(animId);
  }, [isNavigating, currentRoute]);

  const closeModal = () => setSelectedDestination(null);

  const renderContent = () => {
    if (!selectedDestination) return null;
    // ... Content remains the same, just keeping it concise for this block
    const content = {
        home: { title: 'Welcome Home', body: <p className="text-gray-300">Central hub for autonomous research.</p> },
        publications: { title: 'Publications', body: <p className="text-gray-300">Latest research papers and journals.</p> },
        blog: { title: 'Blog Tower', body: <p className="text-gray-300">Technical deep dives and tutorials.</p> },
        about: { title: 'About Plaza', body: <p className="text-gray-300">Portfolio and contact information.</p> }
    };
    return content[selectedDestination.id] || { title: '', body: null };
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-7xl min-h-[800px] bg-black rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="grid grid-cols-5 h-full">
          
          {/* --- Sidebar (Refactored Layout) --- */}
          <div className="col-span-2 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
            
            {/* 1. Header Title */}
            <div className="p-6 border-b border-slate-800 bg-slate-950">
              <h2 className="text-white text-xl font-bold flex items-center gap-2 mb-2">
                <Navigation2 className="w-6 h-6 text-blue-500" />
                Control Center
              </h2>
              <p className="text-gray-400 text-sm">Where do you want to go?</p>
            </div>
            
            {/* 2. Destination List (Moved to Top) */}
            <div className="p-4 space-y-3 bg-slate-900" style={{ maxHeight: "40%" }}>
              {DESTINATIONS.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => navigateTo(dest)}
                  disabled={isNavigating || currentPosition.id === dest.id}
                  className={`w-full px-4 py-4 text-left rounded-xl transition-all border border-slate-700 flex items-center gap-4 group
                    ${currentPosition.id === dest.id ? 'bg-slate-800 border-blue-500/50' : 'hover:bg-slate-800 hover:border-slate-600'}
                    ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className={`p-2 rounded-lg ${currentPosition.id === dest.id ? 'bg-blue-500/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                    <dest.icon className="w-5 h-5" style={{ color: dest.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-200">{dest.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Coords: {dest.position3D.x}, {dest.position3D.z}</div>
                  </div>
                  {currentPosition.id === dest.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
                </button>
              ))}
            </div>
          </div>
          
          {/* --- 3D Viewport --- */}
          <div className="col-span-3 bg-black flex flex-col relative w-full">
            <canvas ref={canvasRef} className="w-full h-[100px] block cursor-move" />
            
            {/* Overlay UI */}
            <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm font-mono">
                    SYS.STATUS: {isNavigating ? 'NAVIGATING' : 'IDLE'}
                </div>
                <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 text-blue-400 text-sm font-mono">
                    BATTERY: 98%
                </div>
            </div>

            {/* Status Pill */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 flex items-center gap-3 shadow-xl">
                 <div className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
                 <span className="text-slate-200 text-sm font-medium">
                    {isNavigating ? "Autonomous Mode Active..." : "Vehicle Parked"}
                 </span>
            </div>
          {/* --- 2D Vector Map Under 3D View --- */}
          <div className="w-full border-t border-slate-800 bg-[#0f1419] h-[300px] overflow-hidden relative">
            <VectorMap
              currentPosition={currentPosition}
              destinations={DESTINATIONS}
              roads={ROADS}
              isNavigating={isNavigating}
              navigationProgress={navigationProgress}
              currentRoute={currentRoute}
            />
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white px-3 py-1 rounded text-xs border border-slate-700">
              Live Satellite Feed
            </div>
          </div>

          </div>

        </div>
      </div>
      
      {/* Pop-up Modal */}
      {selectedDestination && !isNavigating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-8 border border-slate-700 shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <selectedDestination.icon className="w-8 h-8" style={{ color: selectedDestination.color }} />
                    {renderContent().title}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="prose prose-invert">
                {renderContent().body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutonomousBlog;