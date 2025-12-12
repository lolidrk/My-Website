import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, User, Home, Navigation2, MapPin, Layers, Compass } from 'lucide-react';
import * as THREE from 'three';

// --- Configuration Constants ---
// --- Configuration Constants ---
// Define a loop of road nodes: 8 points forming a square/octagon loop
const ROAD_NODES = [
  { x: -60, z: -60 }, // 0: Top-Left
  { x: 0,   z: -60 }, // 1: Top-Mid
  { x: 60,  z: -60 }, // 2: Top-Right
  { x: 60,  z: 0   }, // 3: Right-Mid
  { x: 60,  z: 60  }, // 4: Bottom-Right
  { x: 0,   z: 60  }, // 5: Bottom-Mid
  { x: -60, z: 60  }, // 6: Bottom-Left
  { x: -60, z: 0   }, // 7: Left-Mid
];

const ROADS = [
  { from: ROAD_NODES[0], to: ROAD_NODES[1] },
  { from: ROAD_NODES[1], to: ROAD_NODES[2] },
  { from: ROAD_NODES[2], to: ROAD_NODES[3] },
  { from: ROAD_NODES[3], to: ROAD_NODES[4] },
  { from: ROAD_NODES[4], to: ROAD_NODES[5] },
  { from: ROAD_NODES[5], to: ROAD_NODES[6] },
  { from: ROAD_NODES[6], to: ROAD_NODES[7] },
  { from: ROAD_NODES[7], to: ROAD_NODES[0] },
];

const DESTINATIONS = [
  { 
    id: 'home', 
    name: 'Home Base', 
    icon: Home, 
    coords: { lat: 12.9698, lng: 77.7500 },
    position3D: { x: -80, z: -60 }, // Outside Top-Left
    entryNodeIdx: 0, // Connects to Node 0
    color: '#3b82f6',
    buildingColor: 0x3b82f6,
    height: 8
  },
  { 
    id: 'publications', 
    name: 'Publications Hub', 
    icon: FileText, 
    coords: { lat: 12.9850, lng: 77.7300 },
    position3D: { x: 80, z: -60 }, // Outside Top-Right
    entryNodeIdx: 2, // Connects to Node 2
    color: '#10b981',
    buildingColor: 0x10b981,
    height: 15
  },
  { 
    id: 'blog', 
    name: 'Blog Tower', 
    icon: BookOpen, 
    coords: { lat: 12.9520, lng: 77.7650 },
    position3D: { x: 80, z: 60 }, // Outside Bottom-Right
    entryNodeIdx: 4, // Connects to Node 4
    color: '#f59e0b',
    buildingColor: 0xf59e0b,
    height: 12
  },
  { 
    id: 'about', 
    name: 'About Plaza', 
    icon: User, 
    coords: { lat: 12.9600, lng: 77.7400 },
    position3D: { x: -80, z: 60 }, // Outside Bottom-Left
    entryNodeIdx: 6, // Connects to Node 6
    color: '#8b5cf6',
    buildingColor: 0x8b5cf6,
    height: 10,
    email: 'kalyanikulkarni2002@gmail.com'
  },
];

// --- Vector Map Component ---
const VectorMap = ({ currentPosition, destinations, roads, isNavigating, navigationProgress, currentRoute }) => {
  const viewBoxSize = 200; // Increased view box
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
      
      <div className="absolute top-7 right-7">
      <div className="bg-slate-900/80 p-1.5 rounded-full border border-slate-700 shadow-md text-white">
        <Compass size={14} className="text-blue-400" />
      </div>
    </div>

    </div>
  );
};


const AutonomousBlog = () => {
  const [selectedDestination, setSelectedDestination] = useState(DESTINATIONS[0]);
  const [selectedBlogPost, setSelectedBlogPost] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [currentRoute, setCurrentRoute] = useState<{
    path: { x: number; z: number }[];
    destination: any | null;
  }>({
    path: [],
    destination: null
  });

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const carRef = useRef(null);
  const cameraRef = useRef(null);
  const buildingsRef = useRef([]);

  const [currentPosition, setCurrentPosition] = useState(DESTINATIONS[0]);

  const blogPosts = [
  {
    id: 1,
    title: "How LiDARs Really Work (and Why They Don't Shoot Lasers at Your Face)",
    date: "December 2024",
    preview: "A fun, slightly dramatic deep dive into the sensors that help cars 'see' — minus the sci-fi laser battles Hollywood promised us.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          If you've ever wondered how self-driving cars "see" the world around them, the answer is probably sitting 
          on top of the vehicle, spinning quietly like a tiny disco ball. That's LiDAR — Light Detection and Ranging — 
          and it's basically giving the car superpowers.
        </p>
        
        <h3 className="text-xl font-bold text-white mt-6 mb-3">What Even Is LiDAR?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          LiDAR works by shooting out laser pulses — millions of them per second — and measuring how long it takes 
          for each pulse to bounce back. It's like echolocation for bats, except with light instead of sound. 
          Each returning pulse tells the sensor exactly how far away an object is, down to the centimeter.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          The result? A detailed 3D point cloud of everything around the vehicle: pedestrians, other cars, trees, 
          road signs, that random shopping cart someone left in the parking lot. It updates in real-time, giving 
          the car a constantly refreshed map of its surroundings.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">But Wait, Isn't a Laser Dangerous?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Great question. And the answer is: not really. Automotive LiDAR uses infrared light at wavelengths 
          around 905nm or 1550nm, which are classified as Class 1 lasers. That's the same safety rating as your 
          TV remote or a barcode scanner at the grocery store.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          The power is distributed across a wide field of view, and the pulses are incredibly brief. So no, 
          the self-driving car rolling past you isn't going to accidentally laser your retina. Hollywood lied 
          to us (again).
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Why Not Just Use Cameras?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Cameras are great — they're cheap, high-resolution, and can read street signs. But they struggle in 
          low light, get confused by shadows, and can't directly measure distance. A white car in front of a 
          white wall? Good luck with that.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          LiDAR doesn't care about lighting conditions. Rain? Works. Fog? Mostly works. Complete darkness? 
          Still works. It gives you direct, precise depth information without having to infer it from pixels.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Real Challenge: Processing All That Data</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Here's the thing people don't talk about enough: a single LiDAR can generate millions of points per 
          second. That's a massive amount of data. You need to filter out noise (reflections from rain, dust, 
          insects), cluster points into objects, track those objects over time, and predict where they're going 
          — all in real-time, because the car is moving at 60 mph and needs to make decisions <em>now</em>.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is where sensor fusion comes in. LiDAR gives you the geometry, cameras give you texture and 
          semantics (like reading traffic lights), and radar gives you velocity. Combine all three, and you've 
          got a pretty solid understanding of the world.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Future of LiDAR</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Early LiDAR units cost $75,000 and looked like giant rotating buckets. Now? You can get solid-state 
          LiDAR for under $1,000, and they're getting smaller, cheaper, and more capable every year.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Some companies (looking at you, Tesla) are betting that cameras alone can solve autonomous driving. 
          Others think LiDAR is essential. Personally? I think the debate misses the point. It's not about which 
          sensor is "better" — it's about building systems that are redundant, robust, and safe. And right now, 
          LiDAR is one of the best tools we have for that.
        </p>
        <p className="text-gray-300 leading-relaxed">
          So next time you see a self-driving car with that spinning sensor on top, give it a little nod of 
          respect. It's working hard to not run you over.
        </p>
      </div>
    )
  },
  {
    id: 2,
    title: "Why Sensor Fusion is Harder Than It Sounds",
    date: "November 2024",
    preview: "Combining camera, radar, and LiDAR data sounds simple in theory. In practice, it's like conducting an orchestra where every instrument is playing a different song.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          Sensor fusion is one of those terms that sounds straightforward: you have multiple sensors, you combine 
          their data, and boom — you get a better understanding of the world. Except in reality, it's more like 
          trying to merge three different languages, spoken at different speeds, with different levels of accuracy, 
          all while driving at highway speeds.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Coordinate System Problem</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Let's start with the basics. Every sensor on a vehicle has its own coordinate system. The camera sees 
          the world in pixels. LiDAR measures distances in 3D space. Radar gives you range and velocity in polar 
          coordinates. Before you can fuse anything, you need to transform all of this data into a common reference 
          frame.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is called extrinsic calibration, and it needs to be <em>precise</em>. We're talking millimeter-level 
          accuracy. If your LiDAR is off by just a few degrees, that pedestrian at 50 meters suddenly appears to be 
          standing in the middle of the road instead of on the sidewalk. And now your car is slamming on the brakes 
          for no reason.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Oh, and this calibration? It can drift over time due to vibrations, temperature changes, or just normal 
          wear and tear. So you need mechanisms to detect and correct for miscalibration automatically. Fun times.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Timing is Everything</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Here's another problem: your sensors don't all run at the same frequency. Your camera might capture frames 
          at 30 Hz. Your LiDAR spins at 10 Hz. Your radar updates at 20 Hz. And your GPS? That's refreshing at 
          1-10 Hz depending on the unit.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Why does this matter? Because a car moving at 60 mph (about 27 m/s) covers almost 3 meters in just 100 
          milliseconds. If your sensors are out of sync by even that small amount, you're fusing stale data — trying 
          to combine a LiDAR measurement from 100ms ago with a camera frame from right now. The car you detected? 
          It's not actually where you think it is anymore.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          The solution is temporal alignment: you need to interpolate or extrapolate sensor data to a common 
          timestamp. But interpolation introduces uncertainty. And extrapolation? That's just guessing with 
          extra steps.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Association Problem</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Now let's say you've got everything calibrated and time-synced. Great! But here's the next challenge: 
          how do you know that the object detected by the camera is the same object detected by the LiDAR?
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is called the data association problem, and it's harder than it sounds. The camera might see a car 
          and a pedestrian. The LiDAR might see three distinct clusters of points. The radar might detect two moving 
          targets. Which detection corresponds to which?
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          You can use algorithms like the Hungarian algorithm or Joint Probabilistic Data Association (JPDA) to 
          solve this, but they're computationally expensive. And if you get it wrong? Congrats, you just fused a 
          pedestrian with a lamppost, and now your perception stack thinks there's a 7-foot-tall object that's both 
          stationary and moving at the same time.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Conflicting Information</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Even when everything is aligned and associated correctly, sensors can disagree. The camera says there's 
          a car 20 meters ahead. The LiDAR says 21 meters. The radar says 19.5 meters. Which one is right?
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is where you need robust fusion algorithms — typically Kalman filters or particle filters — that 
          can weigh the reliability of each sensor and produce a fused estimate. But these filters need to know 
          how much to trust each sensor, which depends on environmental conditions. LiDAR is great in clear weather 
          but struggles in heavy rain. Cameras are useless at night without good lighting. Radar is consistent but 
          has low resolution.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          So now you need adaptive fusion: dynamically adjusting trust levels based on context. And that's a whole 
          other research problem.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Computational Constraints</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Oh, and did I mention you have to do all of this in real-time, on embedded hardware, with limited power 
          and cooling? A typical autonomous vehicle might process gigabytes of sensor data per second. You can't 
          just throw a server rack in the trunk.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This means optimizing algorithms, parallelizing computations, and making hard trade-offs between accuracy 
          and latency. Sometimes "good enough" in 50 milliseconds is better than "perfect" in 200 milliseconds — 
          because by the time you finish computing, the world has already changed.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">So Why Bother?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Because when done right, sensor fusion is <em>incredible</em>. You get the best of all worlds: the 
          resolution of cameras, the precision of LiDAR, and the velocity measurements of radar. You get redundancy, 
          so if one sensor fails, the others can compensate. You get robustness across different weather conditions 
          and lighting scenarios.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          It's hard. Really hard. But it's also one of the most important problems in autonomous driving. Because 
          at the end of the day, fusing sensors isn't just about making better maps or tracking objects more 
          accurately. It's about building systems that are safe enough to trust with human lives.
        </p>
        <p className="text-gray-300 leading-relaxed">
          And that's worth the effort.
        </p>
      </div>
    )
  }
];

  // --- Three.js Setup ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 80, 300); // Increased fog distance
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 500);
    camera.position.set(0, 40, 60); // Higher and further back
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(800, 800);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a15, 1);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = false;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0f1419,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(500, 100, 0x1a4d6f, 0x0d2433);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Roads
    const roadWidth = 8;
    const textureLoader = new THREE.TextureLoader();
    const roadTexture = textureLoader.load('/assets/bigger_road.png');
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      map: roadTexture,
      transparent: true,
      roughness: 1.0
    });

    ROADS.forEach(road => {
      const dx = road.to.x - road.from.x;
      const dz = road.to.z - road.from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      // Calculate texture repeat for consistent road appearance
      const repeatY = length / roadWidth;
      const geometry = new THREE.PlaneGeometry(roadWidth, length);
      const material = roadMaterial.clone();
      material.map = roadTexture.clone();
      material.map.repeat.set(1, repeatY);
      material.map.needsUpdate = true;

      const roadMesh = new THREE.Mesh(geometry, material);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -angle;
      roadMesh.position.set((road.from.x + road.to.x)/2, 0.02, (road.from.z + road.to.z)/2);
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);
    });

    // Buildings
    DESTINATIONS.forEach(dest => {
      const group = new THREE.Group();
      
      // Main Building
      const bGeo = new THREE.BoxGeometry(10, dest.height, 10);
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
          w.position.set(2, dest.height - 3 - (i*2), 5.05);
          group.add(w);
      }

      // Parking Spot
      const pGeo = new THREE.PlaneGeometry(5, 8);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
      const parking = new THREE.Mesh(pGeo, pMat);
      parking.rotation.x = -Math.PI / 2;
      parking.position.set(0, 0.02, 10); // Parking is at Z+10 relative to building
      group.add(parking);

      // Connect parking to road visual (Driveway)
      // We need to connect the parking spot (local 0,0,10) to the road node (global ROAD_NODES[dest.entryNodeIdx])
      // Since the building is at dest.position3D, we can calculate the vector to the road node
      
      // For simplicity, we just add a small connector locally
      const connGeo = new THREE.PlaneGeometry(4, 6);
      const conn = new THREE.Mesh(connGeo, pMat);
      conn.rotation.x = -Math.PI/2;
      conn.position.set(0, 0.02, 14);
      group.add(conn);

      group.position.set(dest.position3D.x, 0, dest.position3D.z);
      
      // Rotate building to face the center or the road?
      // Let's rotate them to face the center (0,0)
      const angle = Math.atan2(dest.position3D.x, dest.position3D.z);
      group.rotation.y = angle + Math.PI; // Face inward

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
    // Home is at dest[0].position3D. Parking is +10 local Z (rotated)
    // We need to calculate the global position of the parking spot
    const home = DESTINATIONS[0];
    const homeAngle = Math.atan2(home.position3D.x, home.position3D.z) + Math.PI;
    const parkingOffset = new THREE.Vector3(0, 0, 10);
    parkingOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), homeAngle);
    
    car.position.set(
        home.position3D.x + parkingOffset.x,
        0.1,
        home.position3D.z + parkingOffset.z
    );
    car.rotation.y = homeAngle;

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
  const navigateTo = (destination) => {
    if (isNavigating) return;
    if (currentPosition.id == destination.id)
    {
      setSelectedDestination(destination);
      return;
    }

    // Helper to get global parking position for a destination
    const getParkingPos = (dest) => {
        const angle = Math.atan2(dest.position3D.x, dest.position3D.z) + Math.PI;
        const offset = new THREE.Vector3(0, 0, 10);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        return {
            x: dest.position3D.x + offset.x,
            z: dest.position3D.z + offset.z
        };
    };

    const startParking = getParkingPos(currentPosition);
    const endParking = getParkingPos(destination);

    const startNodeIdx = currentPosition.entryNodeIdx;
    const endNodeIdx = destination.entryNodeIdx;

    // Calculate path along the loop
    // We can go clockwise or counter-clockwise. Let's pick the shortest.
    const numNodes = ROAD_NODES.length;
    let cwDist = (endNodeIdx - startNodeIdx + numNodes) % numNodes;
    let ccwDist = (startNodeIdx - endNodeIdx + numNodes) % numNodes;

    let roadPath = [];
    if (cwDist <= ccwDist) {
        // Go Clockwise
        for (let i = 0; i <= cwDist; i++) {
            roadPath.push(ROAD_NODES[(startNodeIdx + i) % numNodes]);
        }
    } else {
        // Go Counter-Clockwise
        for (let i = 0; i <= ccwDist; i++) {
            roadPath.push(ROAD_NODES[(startNodeIdx - i + numNodes) % numNodes]);
        }
    }

    // Full Path: StartParking -> StartNode -> ... RoadNodes ... -> EndNode -> EndParking
    const routePath = [
        startParking,
        ROAD_NODES[startNodeIdx],
        ...roadPath.slice(1, -1), // Skip first (StartNode) and last (EndNode) to avoid dupes if we want, but actually we need them all
        // Wait, roadPath includes startNode and endNode.
        // So we just need to insert them.
        // Actually, let's just use roadPath as is.
        // But we need to connect parking to the node.
    ];
    
    // Refined Path:
    const finalPath = [
        startParking,
        ROAD_NODES[startNodeIdx],
        ...roadPath.slice(1), // roadPath[0] is startNode, already added
        endParking
    ];

    setCurrentRoute({ path: finalPath, destination });
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

  const closeModal = () => {
  setSelectedDestination(null);
  setSelectedBlogPost(null);
  };
  const renderContent = () => {
    if (!selectedDestination) return null;
    // ... Content remains the same, just keeping it concise for this block
    const content = {
        home: { title: 'Mission Control', body: (
          <div className="space-y-6">
            <p className="text-gray-300 text-lg leading-relaxed">
              Welcome to my autonomous portfolio. This interface represents a living digital twin of my work in machine learning and computer vision.
            </p>

            <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Navigation2 className="w-5 h-5 text-blue-400" />
                Navigation Protocols
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">1</span>
                  <span>Select a destination from the <strong>Control Center</strong> on the left (Publications, Blog, or About).</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">2</span>
                  <span>The vehicle will autonomously pathfind and drive to the selected building in the 3D view.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">3</span>
                  <span>Upon arrival, the details for that section will automatically appear here.</span>
                </li>
              </ul>
            </div>

            <div className="text-sm p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200/80">
              <strong className="text-yellow-500 block mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4"/> Performance Note
              </strong>
              <p className="opacity-80 mb-2">
                This website runs a real-time 3D physics engine directly in your browser. 
              </p>
              <ul className="list-disc list-inside space-y-1 opacity-70 ml-1">
                <li>If the animation feels sluggish, please ensure <strong>Hardware Acceleration</strong> is enabled in your browser settings.</li>
                <li>Performance may be lower on devices with integrated graphics or in battery-saver mode.</li>
              </ul>
            </div>
          </div>
        ) 
      },
  publications: {
  title: 'Mitigating SSRF Threats: Integrating ML and Network Architecture',
  body: (
    <div className="text-gray-300">
      <p>
        Server Side Request Forgery (SSRF) is a vulnerability that when exploited,
        allows the attacker to manipulate the server into making requests to the
        organization's internal network. In this research, we explore the various
        consequences of SSRF and introduce a system which integrates an Intrusion
        Detection System (IDS) and Intrusion Prevention System (IPS) with a 
        dedicated helper server implemented using Nginx. Machine learning models, 
        including XGBoost, are employed for threat detection, achieving high 
        accuracy (98.55%) in classifying URLs as benign or malicious. The study 
        highlights the efficacy of the proposed approach in mitigating SSRF threats.
      </p>

      <a
        href="https://link.springer.com/chapter/10.1007/978-981-97-8669-5_1#citeas"
        target="_blank"
        rel="noopener noreferrer"
      >
        <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">
          Read Paper
        </button>
      </a>
    </div>
  )
},
blog: {
  title: 'Blog Tower',
  body: null
},
about: {
  title: 'About Plaza',
  body: (
    <p className="text-gray-300">
      I'm Kalyani — a machine learning enthusiast with a habit of turning complex problems into things that actually work (most of the time). 
      My interests sit at the intersection of Computer Vision, autonomous systems, and safety-critical AI, especially making advanced 
      driver-assistance features as universal as seatbelts, not luxury add-ons.
      <br /><br />
      I've worked on everything from 3D scene reconstruction and Gaussian splatting to real-time visualization of HD maps and LiDAR data. 
      Recently, I've been part of a team building a full-scale environment visualization system for autonomous vehicles, where I focus on 
      rendering static structures like buildings and trees. (If it doesn't move, I make it look good.)
      <br /><br />
      When I'm not elbow-deep in sensor fusion, Transformers, or regression models, I'm usually learning languages, watching Spy x Family, 
      or attempting to develop chess intuition without blundering my queen.
      <br /><br />
      I like building things that are fast, reliable, and safe — whether that's a predictive model or a visualization pipeline — and I enjoy 
      solving problems that don't come with a neat answer at the back of the book.
      <br /><br />
      If you're interested in collaborating on CV, robotics, or anything that involves turning data into decisions, feel free to reach out 
      at kalyanikulkarni2002@gmail.com.
      <br /><br />
      <a 
        href="https://drive.google.com/file/d/1ObAfUlCZxJTFjtayz1PFJjWL0vS4abp_/view?usp=drive_link"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline hover:text-blue-300"
      >
        View my résumé
      </a>
    </p>
  )
}
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
                  disabled={isNavigating}
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
            <canvas ref={canvasRef} className="w-full h-[100px] block cursor-default" />
            
            {/* Overlay UI */}
            <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm font-mono">
                    SYS.STATUS: {isNavigating ? 'NAVIGATING' : 'IDLE'}
                </div>
            </div>

            {/* Status Pill */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 flex items-center gap-3 shadow-xl">
                 <div className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
                 <span className="text-slate-200 text-sm font-medium">
                    {isNavigating ? "Autonomous Mode Active..." : "Vehicle Parked"}
                 </span>
            </div>
          {/* --- Circular Minimap Overlay --- */}
          <div className="absolute top-6 right-6 w-48 h-48 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg bg-[#0f1419]">
            <VectorMap
              currentPosition={currentPosition}
              destinations={DESTINATIONS}
              roads={ROADS}
              isNavigating={isNavigating}
              navigationProgress={navigationProgress}
              currentRoute={currentRoute}
            />
          </div>


          </div>

        </div>
      </div>
      
      {/* Pop-up Modal */}
      {selectedDestination && !isNavigating && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeModal}>
    <div className="bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[85vh] border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
      
      <div className="flex justify-between items-start p-8 pb-6 border-b border-slate-800">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <selectedDestination.icon className="w-8 h-8" style={{ color: selectedDestination.color }} />
          {selectedDestination.id === 'blog' ? 'Blog Tower' : renderContent().title}
        </h2>
        <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="overflow-y-auto p-8 flex-1">
        {selectedDestination.id === 'blog' ? (
          selectedBlogPost ? (
            <div>
              <button onClick={() => setSelectedBlogPost(null)} className="mb-6 text-blue-400 hover:text-blue-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to all posts
              </button>
              <h3 className="text-2xl font-bold text-white mb-2">{selectedBlogPost.title}</h3>
              <p className="text-gray-400 text-sm mb-6">{selectedBlogPost.date}</p>
              {selectedBlogPost.content}
            </div>
          ) : (
            <div className="space-y-4">
              {blogPosts.map(post => (
                <div key={post.id} onClick={() => setSelectedBlogPost(post)}
                  className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400">{post.title}</h3>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{post.date}</p>
                  <p className="text-gray-300">{post.preview}</p>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="prose prose-invert max-w-none">
            {renderContent().body}
          </div>
        )}
      </div>
    </div>
    </div>
    )}
    </div>
  );
};

export default AutonomousBlog;