import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, User, Home, Navigation2, MapPin } from 'lucide-react';
import * as THREE from 'three';

const AutonomousBlog = () => {
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [currentRoute, setCurrentRoute] = useState<{path: Array<{x: number, z: number}>, destination?: any}>({path: []});
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const carRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingsRef = useRef([]);

  const destinations = [
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

  const [currentPosition, setCurrentPosition] = useState(destinations[0]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 80, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 300);
    camera.position.set(0, 12, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(600, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a15, 1);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

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

    const roadWidth = 6;
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.1
    });

    const roads = [
      { from: { x: 0, z: 0 }, to: { x: -50, z: -50 } },
      { from: { x: 0, z: 0 }, to: { x: 50, z: 50 } },
      { from: { x: 0, z: 0 }, to: { x: -40, z: 40 } },
      { from: { x: -50, z: -50 }, to: { x: 50, z: 50 } },
      { from: { x: 50, z: 50 }, to: { x: -40, z: 40 } },
      { from: { x: -40, z: 40 }, to: { x: -50, z: -50 } },
    ];

    roads.forEach(road => {
      const dx = road.to.x - road.from.x;
      const dz = road.to.z - road.from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const roadGeometry = new THREE.PlaneGeometry(roadWidth, length);
      const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -angle;
      roadMesh.position.set(
        (road.from.x + road.to.x) / 2,
        0.02,
        (road.from.z + road.to.z) / 2
      );
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);

      const segments = Math.floor(length / 5);
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const markingGeometry = new THREE.PlaneGeometry(0.3, 3);
        const markingMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        const marking = new THREE.Mesh(markingGeometry, markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.rotation.z = -angle;
        marking.position.set(
          road.from.x + dx * t,
          0.03,
          road.from.z + dz * t
        );
        scene.add(marking);
      }

      [-roadWidth/2 + 0.3, roadWidth/2 - 0.3].forEach(offset => {
        const edgeGeometry = new THREE.PlaneGeometry(0.15, length);
        const edgeMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffaa00,
          transparent: true,
          opacity: 0.8
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = -Math.PI / 2;
        edge.rotation.z = -angle;
        
        const perpX = Math.cos(angle) * offset;
        const perpZ = -Math.sin(angle) * offset;
        
        edge.position.set(
          (road.from.x + road.to.x) / 2 + perpX,
          0.03,
          (road.from.z + road.to.z) / 2 + perpZ
        );
        scene.add(edge);
      });
    });

    destinations.forEach(dest => {
      const buildingGroup = new THREE.Group();
      
      const buildingGeometry = new THREE.BoxGeometry(8, dest.height, 8);
      const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: dest.buildingColor,
        roughness: 0.7,
        metalness: 0.3
      });
      const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
      buildingMesh.position.y = dest.height / 2;
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      buildingGroup.add(buildingMesh);

      const windowRows = Math.floor(dest.height / 2);
      const windowsPerRow = 4;
      const windowSize = 0.6;
      const spacing = 1.5;

      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowsPerRow; col++) {
          const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
          const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x60a5fa,
            emissive: 0x60a5fa,
            emissiveIntensity: 0.4
          });
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
          windowMesh.position.x = (col - windowsPerRow/2 + 0.5) * spacing;
          windowMesh.position.y = row * 2 + 2;
          windowMesh.position.z = 4.05;
          buildingGroup.add(windowMesh);

          const backWindow = windowMesh.clone();
          backWindow.position.z = -4.05;
          buildingGroup.add(backWindow);
        }
      }

      const roofGeometry = new THREE.CylinderGeometry(5, 4.5, 0.5, 4);
      const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: dest.buildingColor,
        emissive: dest.buildingColor,
        emissiveIntensity: 0.2
      });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = dest.height + 0.25;
      roof.rotation.y = Math.PI / 4;
      buildingGroup.add(roof);

      const signGeometry = new THREE.BoxGeometry(6, 1, 0.2);
      const signMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8
      });
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      sign.position.y = dest.height - 1;
      sign.position.z = 4.2;
      buildingGroup.add(sign);

      const parkingGeometry = new THREE.PlaneGeometry(3, 5);
      const parkingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3a3a3a,
        roughness: 0.9
      });
      const parking = new THREE.Mesh(parkingGeometry, parkingMaterial);
      parking.rotation.x = -Math.PI / 2;
      parking.position.set(0, 0.025, 8);
      buildingGroup.add(parking);

      const lineGeometry = new THREE.PlaneGeometry(0.1, 5);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      [-1.2, 1.2].forEach(offset => {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(offset, 0.03, 8);
        buildingGroup.add(line);
      });

      buildingGroup.position.set(dest.position3D.x, 0, dest.position3D.z);
      buildingGroup.userData = { id: dest.id, name: dest.name };
      scene.add(buildingGroup);
      buildingsRef.current.push(buildingGroup);
    });

    const car = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(1.8, 0.6, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a4d8f,
      metalness: 0.9,
      roughness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);

    const cabinGeometry = new THREE.BoxGeometry(1.6, 0.7, 2.5);
    const cabinMaterial = new THREE.MeshPhysicalMaterial({ 
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.3,
      transmission: 0.9
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = 1.15;
    cabin.position.z = -0.3;
    cabin.castShadow = true;
    car.add(cabin);

    const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0a0a0a,
      metalness: 0.8,
      roughness: 0.3
    });

    const wheelPositions = [
      { x: -0.9, z: 1.3 },
      { x: 0.9, z: 1.3 },
      { x: -0.9, z: -1.3 },
      { x: 0.9, z: -1.3 }
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wheel.position.set(pos.x, 0.35, pos.z);
      car.add(wheel);
    });

    const headlightGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      emissive: 0xaaddff,
      emissiveIntensity: 2
    });
    
    [-0.6, 0.6].forEach(x => {
      const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
      headlight.position.set(x, 0.5, 2.1);
      car.add(headlight);
      
      const spotLight = new THREE.SpotLight(0xaaddff, 1.5, 30, Math.PI / 8, 0.5);
      spotLight.position.set(x, 0.5, 2.1);
      spotLight.target.position.set(x, 0, 15);
      spotLight.castShadow = true;
      scene.add(spotLight.target);
      car.add(spotLight);
    });

    const trajectoryMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6
    });
    const trajectoryGeometry = new THREE.BufferGeometry();
    const trajectoryPoints = [];
    for (let i = 0; i < 20; i++) {
      trajectoryPoints.push(new THREE.Vector3(0, 0.1, i * 2));
    }
    trajectoryGeometry.setFromPoints(trajectoryPoints);
    const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    car.add(trajectoryLine);

    car.position.set(0, 0.1, 8);
    car.castShadow = true;
    carRef.current = car;
    scene.add(car);

    let frame = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      frame++;
      
      if (!isNavigating && carRef.current) {
        carRef.current.position.y = 0.1 + Math.sin(frame * 0.02) * 0.02;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
    };
  }, [isNavigating]);

  useEffect(() => {
    if (!isNavigating || !carRef.current || !cameraRef.current || currentRoute.path.length === 0) return;

    const duration = 4000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setNavigationProgress(progress);

      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const index = Math.floor(eased * (currentRoute.path.length - 1));
      const targetPos = currentRoute.path[index];
      
      carRef.current.position.x = targetPos.x;
      carRef.current.position.z = targetPos.z;
      
      if (index < currentRoute.path.length - 1) {
        const nextPos = currentRoute.path[index + 1];
        const angle = Math.atan2(nextPos.x - targetPos.x, nextPos.z - targetPos.z);
        carRef.current.rotation.y = angle;
      }

      const camDistance = 18;
      const camHeight = 10;
      const lookAhead = 3;
      
      const targetCamX = carRef.current.position.x - Math.sin(carRef.current.rotation.y) * camDistance;
      const targetCamZ = carRef.current.position.z - Math.cos(carRef.current.rotation.y) * camDistance;
      const targetCamY = camHeight;
      
      cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.08;
      cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.08;
      cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.08;
      
      const lookAtX = carRef.current.position.x + Math.sin(carRef.current.rotation.y) * lookAhead;
      const lookAtZ = carRef.current.position.z + Math.cos(carRef.current.rotation.y) * lookAhead;
      cameraRef.current.lookAt(lookAtX, 1, lookAtZ);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsNavigating(false);
        setTimeout(() => {
          setSelectedDestination(currentRoute.destination);
        }, 500);
      }
    };

    animate();
  }, [isNavigating, currentRoute]);

  const navigateTo = (destination) => {
    if (isNavigating || currentPosition.id === destination.id) return;

    const route = [];
    const steps = 80;
    const startPos = { x: carRef.current.position.x, z: carRef.current.position.z };
    const endPos = { x: destination.position3D.x, z: destination.position3D.z + 8 };

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const curve = Math.sin(t * Math.PI) * 8;
      route.push({
        x: startPos.x + (endPos.x - startPos.x) * t + curve,
        z: startPos.z + (endPos.z - startPos.z) * t
      });
    }

    setCurrentRoute({path: route, destination: destination});
    setIsNavigating(true);
    setCurrentPosition(destination);
  };

  const closeModal = () => {
    setSelectedDestination(null);
  };

  const renderContent = () => {
    if (!selectedDestination) return null;

    const content = {
      home: {
        title: 'Welcome Home',
        body: (
          <div className="space-y-4">
            <p className="text-gray-300">
              Welcome to my autonomous driving research hub. Safety meets the road.
            </p>
          </div>
        )
      },
      publications: {
        title: 'Research Publications',
        body: (
          <div className="space-y-4">
            <div className="bg-slate-700 p-6 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer">
              <h3 className="text-xl font-semibold text-white mb-2">
                Mitigating SSRF Threats: Integrating ML and Network Architecture
              </h3>
              <p className="text-sm text-gray-400 mb-3">2024 • IEEE Conference</p>
              <p className="text-gray-300 mb-4">
                Server Side Request Forgery (SSRF) is a vulnerability that when exploited, allows the attacker to manipulate the server into making requests to the organization’s internal network. In this research, we explore the various consequences of SSRF and introduce a system which integrates an Intrusion Detection System (IDS) and Intrusion Prevention System (IPS) with a dedicated helper server implemented using Nginx. Machine learning models, including XGBoost, are employed for threat detection, achieving high accuracy (98.55%) in classifying URLs as benign or malicious. The study highlights the efficacy of the proposed approach in mitigating SSRF threats, showcasing the importance of integrating machine learning with network security for robust threat detection and prevention. The practical implications of this approach include enhanced system security, reduced vulnerabilities to SSRF attacks, and improved defense mechanisms against malicious URL requests. Github Link: https://github.com/lolidrk/SSRF_Framework.git
              </p>
              <button onClick={() => window.open("https://link.springer.com/chapter/10.1007/978-981-97-8669-5_1", "_blank")}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Read Paper
              </button>

            </div>
          </div>
        )
      },
      blog: {
        title: 'Latest Posts',
        body: (
          <div className="space-y-4">
            <div className="bg-slate-700 p-6 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer">
              <h3 className="text-xl font-semibold text-white mb-2">
                Understanding LiDAR Technology
              </h3>
              <p className="text-sm text-gray-400 mb-3">Nov 2025 • 10 min read</p>
              <p className="text-gray-300">
                How LiDAR sensors create detailed 3D maps for autonomous vehicles...
              </p>
            </div>
          </div>
        )
      },
      about: {
        title: 'About Me',
        body: (
          <div className="space-y-4">
            <p className="text-gray-300">
              Machine learning researcher focused on autonomous driving systems. 
              Combining computer vision, deep learning, and robotics.
            </p>
          </div>
        )
      }
    };

    return content[selectedDestination.id];
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-full max-h-[800px] bg-black rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="grid grid-cols-5 h-full">
          <div className="col-span-2 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-white text-xl font-bold flex items-center gap-2">
                <Navigation2 className="w-5 h-5 text-blue-500" />
                Navigation Map
              </h2>
              <p className="text-xs text-gray-400 mt-1">Whitefield, Bangalore</p>
            </div>
            
            <div className="flex-1 relative bg-gray-300">
              <img
                src="https://staticmap.openstreetmap.de/staticmap.php?center=12.9650,77.7400&zoom=13&size=600x600&markers=12.9698,77.7500,red-p|12.9850,77.7300,green-p|12.9520,77.7650,blue-p|12.9600,77.7400,yellow-p"
                className="w-full h-full object-cover"
              />
              
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg">
                Current: {currentPosition.name}
              </div>
            </div>
            
            <div className="p-4 space-y-2 bg-slate-950 border-t border-slate-800 max-h-64 overflow-y-auto">
              {destinations.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => navigateTo(dest)}
                  disabled={isNavigating || currentPosition.id === dest.id}
                  className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-3 border-l-4"
                  style={{ borderLeftColor: dest.color }}
                >
                  <dest.icon className="w-5 h-5" style={{ color: dest.color }} />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{dest.name}</div>
                    <div className="text-xs text-gray-400">
                      {dest.coords.lat.toFixed(4)}°N, {dest.coords.lng.toFixed(4)}°E
                    </div>
                  </div>
                  {currentPosition.id === dest.id && (
                    <MapPin className="w-4 h-4 text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="col-span-3 bg-gradient-to-b from-slate-950 to-black flex flex-col">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-white text-2xl font-bold mb-1">Autopilot Visualization</h2>
              <p className="text-gray-400 text-sm">Real-time vehicle navigation</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="relative">
                <canvas ref={canvasRef} className="rounded-xl shadow-2xl ring-1 ring-slate-700" />
                
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                  <div className="bg-black bg-opacity-70 backdrop-blur-sm px-4 py-2 rounded-lg border border-emerald-500">
                    <div className="text-emerald-400 text-sm font-mono font-bold">AUTOPILOT</div>
                    <div className="text-white text-xs">Active</div>
                  </div>
                  
                  <div className="bg-black bg-opacity-70 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-500">
                    <div className="text-blue-400 text-sm font-mono font-bold">
                      {isNavigating ? `${Math.round(navigationProgress * 100)}%` : 'PARKED'}
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-80 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-700 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isNavigating ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  <span className="text-white font-medium text-sm">
                    {isNavigating 
                      ? `Navigating to ${currentRoute.destination?.name}...` 
                      : `Parked at ${currentPosition.name}`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {selectedDestination && !isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-8 border border-slate-700"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: selectedDestination.color }}>
                  <selectedDestination.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">{renderContent().title}</h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white text-3xl">×</button>
            </div>
            <div className="text-gray-300">{renderContent().body}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutonomousBlog;