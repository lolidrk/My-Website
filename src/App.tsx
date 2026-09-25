import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, User, Home, Navigation2, MapPin, Layers, Compass } from 'lucide-react';
import * as THREE from 'three';
import mcAfeeImage from '../src/assets/McAfeeThirthyFive.png';
import thysRanst from '../src/assets/ThysRanst.png';

// --- Configuration Constants ---
export interface Waypoint {
  name?: string;
  x: number;
  z: number;
  heading?: number;
}

const cornerArcRadius = 8;
const cornerOffset = 52;

const getCircuitArcPoints = (cx: number, cz: number, a1: number, a2: number): Waypoint[] => {
  const pts: Waypoint[] = [];
  const steps = 4;
  for (let s = 1; s < steps; s++) {
    const a = a1 + (s / steps) * (a2 - a1);
    pts.push({
      name: `arc_${cx}_${cz}_${s}`,
      x: cx + cornerArcRadius * Math.cos(a),
      z: cz + cornerArcRadius * Math.sin(a),
    });
  }
  return pts;
};

// 24 waypoints along the closed circuit
const CIRCUIT_WAYPOINTS: Waypoint[] = [
  { name: 'home', x: 0, z: -60, heading: Math.PI / 2 },
  { name: 'top_right_start', x: 52, z: -60 },
  ...getCircuitArcPoints(cornerOffset, -cornerOffset, 3 * Math.PI / 2, 2 * Math.PI),
  { name: 'top_right_end', x: 60, z: -52 },
  { name: 'publications', x: 60, z: 0, heading: 0 },
  { name: 'bot_right_start', x: 60, z: 52 },
  ...getCircuitArcPoints(cornerOffset, cornerOffset, 0, Math.PI / 2),
  { name: 'bot_right_end', x: 52, z: 60 },
  { name: 'blog', x: 0, z: 60, heading: -Math.PI / 2 },
  { name: 'bot_left_start', x: -52, z: 60 },
  ...getCircuitArcPoints(-cornerOffset, cornerOffset, Math.PI / 2, Math.PI),
  { name: 'bot_left_end', x: -60, z: 52 },
  { name: 'about', x: -60, z: 0, heading: Math.PI },
  { name: 'top_left_start', x: -60, z: -52 },
  ...getCircuitArcPoints(-cornerOffset, -cornerOffset, Math.PI, 3 * Math.PI / 2),
  { name: 'top_left_end', x: -52, z: -60 },
];

const computeRoute = (fromId: string, toId: string): Waypoint[] => {
  const startIdx = CIRCUIT_WAYPOINTS.findIndex(p => p.name === fromId);
  const endIdx = CIRCUIT_WAYPOINTS.findIndex(p => p.name === toId);
  if (startIdx === -1 || endIdx === -1) return [];

  const N = CIRCUIT_WAYPOINTS.length;
  let cwDist = (endIdx - startIdx + N) % N;
  let ccwDist = (startIdx - endIdx + N) % N;

  const path: Waypoint[] = [];
  if (cwDist <= ccwDist) {
    for (let i = 0; i <= cwDist; i++) {
      path.push(CIRCUIT_WAYPOINTS[(startIdx + i) % N]);
    }
  } else {
    for (let i = 0; i <= ccwDist; i++) {
      path.push(CIRCUIT_WAYPOINTS[(startIdx - i + N) % N]);
    }
  }
  return path;
};

// 4 Straight Roads forming the sides of the circuit
const ROADS = [
  { from: { x: -52, z: -60 }, to: { x: 52, z: -60 } }, // North
  { from: { x: 60, z: -52 }, to: { x: 60, z: 52 } },   // East
  { from: { x: 52, z: 60 }, to: { x: -52, z: 60 } },   // South
  { from: { x: -60, z: 52 }, to: { x: -60, z: -52 } }, // West
];

// 4 Destinations along the 4 sides of the loop
const DESTINATIONS = [
  { 
    id: 'home', 
    name: 'Home Base', 
    icon: Home, 
    coords: { lat: 12.9698, lng: 77.7500 },
    position3D: { x: 0, z: -74 },
    stopPosition: { x: 0, z: -60 },
    color: '#3b82f6',
    buildingColor: 0x3b82f6,
    height: 8
  },
  { 
    id: 'publications', 
    name: 'Publications Hub', 
    icon: FileText, 
    coords: { lat: 12.9850, lng: 77.7300 },
    position3D: { x: 74, z: 0 },
    stopPosition: { x: 60, z: 0 },
    color: '#10b981',
    buildingColor: 0x10b981,
    height: 15
  },
  { 
    id: 'blog', 
    name: 'Blog Tower', 
    icon: BookOpen, 
    coords: { lat: 12.9520, lng: 77.7650 },
    position3D: { x: 0, z: 74 },
    stopPosition: { x: 0, z: 60 },
    color: '#f59e0b',
    buildingColor: 0xf59e0b,
    height: 12
  },
  { 
    id: 'about', 
    name: 'About Plaza', 
    icon: User, 
    coords: { lat: 12.9600, lng: 77.7400 },
    position3D: { x: -74, z: 0 },
    stopPosition: { x: -60, z: 0 },
    color: '#8b5cf6',
    buildingColor: 0x8b5cf6,
    height: 10,
    email: 'kalyanikulkarni2002@gmail.com'
  },
];

// --- Vector Map Component ---
const VectorMap = ({ currentPosition, destinations, isNavigating, navigationProgress, currentRoute }: any) => {
  const viewBoxSize = 200;
  const offset = viewBoxSize / 2;

  // Calculate dynamic car position for the 2D map
  const getCarPosition = () => {
    if (!isNavigating || !currentRoute.path || currentRoute.path.length === 0) {
      return currentPosition.stopPosition || { x: 0, z: -60 };
    }
    
    const totalSegments = currentRoute.path.length - 1;
    if (totalSegments <= 0) return currentPosition.stopPosition || { x: 0, z: -60 };

    const progressPerSegment = 1 / totalSegments;
    const currentSegmentIndex = Math.min(
      Math.floor(navigationProgress / progressPerSegment),
      totalSegments - 1
    );
    const segmentProgress = (navigationProgress - (currentSegmentIndex * progressPerSegment)) / progressPerSegment;

    const p1 = currentRoute.path[currentSegmentIndex];
    const p2 = currentRoute.path[currentSegmentIndex + 1];

    if (!p1 || !p2) return currentPosition.stopPosition || { x: 0, z: -60 };

    return {
      x: p1.x + (p2.x - p1.x) * segmentProgress,
      z: p1.z + (p2.z - p1.z) * segmentProgress
    };
  };

  const carPos = getCarPosition();

  let rotation = 0;
  if (isNavigating && currentRoute.path.length > 1) {
    const totalSegments = currentRoute.path.length - 1;
    const progressPerSegment = 1 / totalSegments;
    const idx = Math.min(Math.floor(navigationProgress / progressPerSegment), totalSegments - 1);
    const p1 = currentRoute.path[idx];
    const p2 = currentRoute.path[idx + 1];
    if (p1 && p2) {
      rotation = Math.atan2(p2.x - p1.x, -(p2.z - p1.z)) * (180 / Math.PI);
    }
  }

  return (
    <div className="w-full h-full bg-[#0f1419] relative overflow-hidden select-none">
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
        style={{ padding: '16px' }}
      >
        {/* Roads: Continuous Circuit with Curved Corners */}
        <rect 
          x="-60" y="-60" width="120" height="120" rx="8" ry="8"
          fill="none" stroke="#2d3748" strokeWidth="8" strokeLinejoin="round" 
        />
        <rect 
          x="-60" y="-60" width="120" height="120" rx="8" ry="8"
          fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" strokeLinejoin="round" 
        />

        {/* Destination Zones */}
        {destinations.map((dest: any) => (
          <g key={dest.id} transform={`translate(${dest.position3D.x}, ${dest.position3D.z})`}>
            {/* Connection dashed line */}
            <line 
              x1="0" y1="0" 
              x2={dest.stopPosition.x - dest.position3D.x} 
              y2={dest.stopPosition.z - dest.position3D.z} 
              stroke="#475569" strokeWidth="2" strokeDasharray="2 2" 
            />
            
            {/* Building Marker */}
            <rect x="-6" y="-6" width="12" height="12" fill={dest.color} rx="2" stroke="#0a0a15" strokeWidth="1.5"/>
            
            {/* Label */}
            <text 
              y={dest.position3D.z < -40 ? -10 : 13} 
              textAnchor="middle" fill="#94a3b8" fontSize="5" fontWeight="600" 
              style={{ textShadow: '0px 1px 2px black' }}
            >
              {dest.name}
            </text>
          </g>
        ))}

        {/* Car Puck */}
        <g transform={`translate(${carPos.x}, ${carPos.z}) rotate(${rotation})`}>
          <circle r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
          <path d="M 0 -7 L 3 -3 L -3 -3 Z" fill="#60a5fa" />
        </g>
      </svg>
      
      <div className="absolute top-3 right-3">
        <div className="bg-slate-900/80 p-1 rounded-full border border-slate-700 shadow-md text-white">
          <Compass size={13} className="text-blue-400" />
        </div>
      </div>
    </div>
  );
};

const AutonomousBlog = () => {
  const [selectedDestination, setSelectedDestination] = useState<any>(DESTINATIONS[0]);
  const [selectedBlogPost, setSelectedBlogPost] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [currentRoute, setCurrentRoute] = useState<{
    path: Waypoint[];
    destination: any | null;
  }>({
    path: [],
    destination: null
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const carRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const buildingsRef = useRef<THREE.Group[]>([]);

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
  },
  {
    id: 3,
    title: "Hacking a Self-Driving Car with a Post-it Note",
    date: "January 2025",
    preview: "Adversarial attacks are the optical illusions of the AI world. Here is how a piece of tape can turn a Stop sign into a Speed Limit sign.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          Imagine you are a state-of-the-art Deep Learning model. You have been trained on millions of images. 
          You can spot a pedestrian in a blizzard. You can distinguish a Chihuahua from a blueberry muffin. 
          But then, someone puts a small, specifically patterned sticker on a Stop sign.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          To a human, it’s just a vandalized Stop sign. But to the model's internal mathematical representation, 
          that sticker shifts the probability distribution just enough to flip the final classification. 
          It is now confidentially a "Speed Limit 45" sign. Welcome to the terrifying world of <strong>Adversarial Attacks</strong>.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">It's Not Magic, It's Math</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Neural networks work by finding complex patterns in pixel data (edges, textures, shapes). Adversarial attacks exploit this by introducing 
          perturbations—tiny changes to pixels that are often invisible to the human eye but push the image across a 
          decision boundary in the model's high-dimensional space.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          To understand <em>how</em> this happens, you have to look at the "Gradient." When we train an AI, we use the gradient to minimize error—essentially 
          telling the model, "Change your parameters this way to get the right answer."
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          An attack works in reverse. The attacker asks the model, "How do I change this image's pixels to <strong>maximize</strong> the error?" 
          The model's own math reveals the exact weak spots. The attacker then nudges the pixels in that specific direction. 
          It is jujitsu for algorithms; using the model's own force against it.
        </p>
         
        {/* --- IMAGE START --- */}
        <figure className="float-right ml-6 mb-4 w-64">
          <img 
            src={mcAfeeImage} 
            alt="McAfee research showing a 35 mph sign modified with tape to look like 85 mph to a computer vision system"
            className="w-full rounded-lg shadow-lg border border-gray-700"
          />
          <figcaption className="text-center text-gray-400 text-sm mt-2">
            Source: McAfee ATR. The Mobileye camera read this modified sign as "85 MPH".
          </figcaption>
        </figure>
         {/* --- IMAGE END --- */}

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The McAfee "Speed Limit" Hack</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Digital attacks are one thing, but physical attacks are scarier. In a famous study, researchers from McAfee ATR managed to fool a 
          Tesla Model S (specifically the Mobileye EyeQ3 camera system) into accelerating autonomously.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          They didn't hack the software. They simply went to a hardware store. By placing a 2-inch strip of black electrical tape 
          horizontally across the middle of the "3" on a "35 MPH" sign, they slightly elongated the center line. 
          To a human, it still clearly looked like a 3. But to the computer vision algorithm, the specific arrangement of edges and contrast 
          perfectly matched the statistical features of an "8".
        </p>

        <p className="text-gray-300 leading-relaxed mb-4">
          The car read the sign as "85 MPH" and the Traffic Aware Cruise Control (TACC) automatically accelerated the vehicle towards that speed. 
          This proves that you don't need a supercomputer to crash a car; you just need to understand how the vision sensor extracts features.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Invisibility Cloak</h3>
        {/* --- IMAGE START --- */}
        <figure className="float-right ml-6 mb-4 w-64">
          <img 
            src={thysRanst} 
            alt="An adversarial patch that is successfully able to hide persons from a person detector. Left: The person without a patch is successfully detected. Right: The person holding the patch is ignored."
            className="w-full rounded-lg shadow-lg border border-gray-700"
          />
          <figcaption className="text-center text-gray-400 text-sm mt-2">
            Source: Fooling automated surveillance cameras: adversarial patches to attack person detection.
          </figcaption>
        </figure>
         {/* --- IMAGE END --- */}
        <p className="text-gray-300 leading-relaxed mb-4">
          It isn't just about making a Stop sign look like a Speed Limit sign. Sometimes, the goal is to make things disappear entirely.
          Researchers (Thys et al.) developed "adversarial patches"—trippy, psychedelic patterns that look like abstract art to us.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          These patches effectively hack object detectors like <strong>YOLO (You Only Look Once)</strong>. 
          YOLO divides an image into a grid and assigns an "objectness" score to each section. The adversarial patch is optimized to 
          crush this objectness score.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          When a person holds this printed patch over their stomach, the patch acts as a "salient" distractor. 
          It overwhelms the neural network's activation map, causing the probability of the "Person" class to drop below the detection threshold. 
          The bounding box simply vanishes. To the AI, the person has ceased to exist.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Do Hackers Need the Source Code?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          You might think, "Well, my model is proprietary and hidden on a server, so I'm safe." Unfortunately, not quite.
          Attacks are split into <strong>White Box</strong> (attacker has the model's code) and <strong>Black Box</strong> (attacker knows nothing).
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          In a Black Box attack, hackers can train their <em>own</em> substitute model to mimic yours, generate attacks against their substitute, 
          and then use those same attacks on your model. Surprisingly, these attacks are often "transferable." 
          An adversarial image that fools a Google model will often fool a Facebook model, because they both learn similar features about the world.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">How We Fix It</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          <strong>1. Adversarial Training:</strong> We essentially "vaccinate" the model by generating these attacks ourselves 
          during the training phase and teaching the model to ignore them.
          <br/><br/>
          <strong>2. Sensor Redundancy:</strong> This is the big one. If the camera thinks the Stop sign is a Speed Limit sign, 
          but the HD Map says "There is definitely a junction here," and the Lidar sees a wall, the car should be 
          smart enough to prioritize safety over the camera's confusion.
          <br/><br/>
          <strong>3. Input Sanitization:</strong> Before the image even reaches the neural network, we can "wash" it. 
          Techniques like JPEG compression or slight blurring can destroy the delicate high-frequency noise of an attack 
          without hurting the overall image too much.
          <br/><br/>
          <strong>4. The Infinite Arms Race:</strong> The reality is that defense is harder than offense. 
          Every time researchers invent a new defense, attackers find a way to bypass it. Security in AI isn't a destination; it’s a constant game of cat and mouse.
        </p>
      </div>
    )
  },
  {
    id: 4,
    title: "NeRFs vs. Gaussian Splatting: The Battle for 3D Supremacy",
    date: "February 2025",
    preview: "Why represent a 3D world with a neural network when you can just throw millions of glowing 3D blobs at the screen?",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-8">
          For a few years, <strong>NeRFs (Neural Radiance Fields)</strong> were the undisputed kings of 3D reconstruction. 
          They used neural networks to "imagine" what an object looked like from any angle. The results were photorealistic, 
          but rendering them was painfully slow.
        </p>
        <p className="text-gray-300 text-lg leading-relaxed mb-12">
          Enter <strong>3D Gaussian Splatting (3DGS)</strong>. It dropped in 2023, and it essentially said: "Forget the neural network. 
          Let's just use millions of 3D ellipsoids." But before we choose a winner, we need to understand the battlefield.
        </p>
    
        {/* ================================================================================== */}
        {/* PART 1: THE BASICS - HOW 3D WORKS */}
        {/* ================================================================================== */}
        
        <div className="border-l-4 border-blue-500 pl-6 my-10 bg-gray-900/50 py-4 rounded-r-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Part 1: The Basics (Computer Vision 101)</h2>
          <p className="text-gray-300 mb-4">
              Before we talk about AI, we have to solve a physics problem: <strong>How do we get 3D depth from flat 2D images?</strong>
          </p>
        </div>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">1. The Pinhole Camera Model</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Every photo you take is a squashed version of reality. A 3D world (X, Y, Z) is projected onto a 2D plane (u, v pixels).
          To reverse this, we need to know two things about the camera that took the photo:
        </p>
        <ul className="list-disc list-inside text-gray-300 mb-6 ml-4 space-y-2">
          <li><strong>Extrinsics (Where was the camera?):</strong> The Position (X,Y,Z) and Rotation of the camera in the world.</li>
          <li><strong>Intrinsics (How does the lens work?):</strong> The Focal Length and Principal Point. This tells us how "zoomed in" the image is.</li>
        </ul>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">2. Structure from Motion (SfM) & COLMAP</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is Step Zero for both NeRFs and Gaussian Splats. We feed 50-100 images into a tool called <strong>COLMAP</strong>.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          COLMAP uses algorithms like SIFT (Scale-Invariant Feature Transform) to find "key points"—distinctive corners, edges, or textures 
          that appear in multiple photos. If it sees the same "corner of a table" in Image A and Image B, it can draw a line from both cameras. 
          <strong>Where those lines intersect in 3D space is the point's location.</strong>
        </p>
        
        <p className="text-gray-300 leading-relaxed mb-8">
          This process creates a <strong>"Sparse Point Cloud"</strong>—a ghostly cloud of floating dots that roughly outlines the scene. 
          This is our starting point.
        </p>
    
        {/* ================================================================================== */}
        {/* PART 2: THE NERF ERA */}
        {/* ================================================================================== */}
    
        <div className="border-l-4 border-purple-500 pl-6 my-10 bg-gray-900/50 py-4 rounded-r-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Part 2: The NeRF Era (Implicit Representation)</h2>
        </div>
    
        <p className="text-gray-300 leading-relaxed mb-4">
          NeRFs look at that Sparse Point Cloud and say, "That's not enough detail." But instead of storing more points, NeRFs store the scene 
          inside a function.
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The "Black Box" Approach</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          A NeRF is a <strong>Multi-Layer Perceptron (MLP)</strong>—a tiny neural network. You give it a coordinate (X, Y, Z) and a viewing direction, 
          and it outputs a Color (RGB) and a Density (Sigma).
          <br/>
          <em>Input: (x, y, z, theta, phi) → Network → Output: (R, G, B, Opacity)</em>
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">Why is it so slow? (Ray Marching)</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          To render a <strong>single pixel</strong> on your screen, the NeRF engine has to shoot a ray through that pixel into the 3D void. 
          Because it doesn't know where objects are, it has to "march" along that ray, stopping every few millimeters to ask the neural network: 
          "Is there anything here?"
        </p>
        <p className="text-gray-300 leading-relaxed mb-8">
          It does this hundreds of times <em>per ray</em>. For a 1080p image (2 million pixels), that is billions of network queries per frame. 
          That is why NeRFs run at 0.5 FPS.
        </p>
    
        {/* ================================================================================== */}
        {/* PART 3: THE SPLATTING REVOLUTION */}
        {/* ================================================================================== */}
    
        <div className="border-l-4 border-green-500 pl-6 my-10 bg-gray-900/50 py-4 rounded-r-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Part 3: Gaussian Splatting (Explicit Representation)</h2>
        </div>
    
        <p className="text-gray-300 leading-relaxed mb-4">
          Gaussian Splatting is a return to "Explicit" geometry. It doesn't use a neural network to render. It uses a list of blobs.
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The Anatomy of a Splat</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Instead of triangles (like in video games), we use <strong>3D Gaussians</strong> (ellipsoids). 
          The system initializes one Gaussian at every point in the COLMAP sparse cloud. Each Gaussian carries these parameters:
        </p>
        <ul className="list-disc list-inside text-gray-300 mb-6 ml-4 space-y-2">
          <li><strong>Position (Mean):</strong> XYZ center.</li>
          <li><strong>Covariance Matrix:</strong> A 3x3 matrix that defines the shape. Is it a long thin cigar? A flat pancake? A perfect sphere?</li>
          <li><strong>Alpha:</strong> How transparent it is.</li>
          <li><strong>Spherical Harmonics (SH):</strong> This is the magic. It stores 16+ numbers that define how the color changes depending on the viewing angle (simulating gloss/reflections).</li>
        </ul>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">How It Learns: Adaptive Density Control</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is the most brilliant part of the algorithm. We start with a sparse, hole-filled cloud. We need to fill it in.
          We perform <strong>Gradient Descent</strong> comparing the rendered image to the real photo.
        </p>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h4 className="font-bold text-blue-400 mb-2">The "Clone vs. Split" Logic:</h4>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li><strong>Under-Reconstruction:</strong> If an area is too blurry but the Gaussian is small, the system <strong>CLONES</strong> it (makes a copy) and moves it slightly to fill the gap.</li>
            <li><strong>Over-Reconstruction:</strong> If a Gaussian is huge and trying to cover too much detail (high variance), the system <strong>SPLITS</strong> it into two smaller Gaussians to capture finer detail.</li>
            <li><strong>Pruning:</strong> If a Gaussian becomes virtually invisible (Alpha &lt; 0.005), it is deleted to save memory.</li>
          </ul>
        </div>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The Speed Secret: Tile-Based Rasterization</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          NeRFs are slow because of Ray Marching. Gaussian Splatting is fast because of <strong>Rasterization</strong>.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          1. <strong>Projection:</strong> The 3D ellipsoids are mathematically projected onto the 2D camera plane.
          <br/>
          2. <strong>Sorting:</strong> The system uses a super-fast GPU Radix Sort to order the splats from front-to-back.
          <br/>
          3. <strong>Tiling:</strong> The screen is divided into 16x16 pixel tiles. Each tile only processes the splats that touch it.
          <br/>
          4. <strong>Alpha Blending:</strong> The colors are accumulated until the opacity reaches 100%.
        </p>
        <p className="text-gray-300 leading-relaxed mb-8">
          This pipeline avoids querying a neural network entirely. It’s pure matrix math, which GPUs eat for breakfast. 
          This is how we get <strong>100+ FPS</strong>.
        </p>
    
        {/* ================================================================================== */}
        {/* CONCLUSION */}
        {/* ================================================================================== */}
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The Verdict</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          <strong>NeRFs</strong> are perfect if you have tiny storage limits (MBs) and don't care about render time.
          <br/>
          <strong>Gaussian Splats</strong> are the future for real-time applications (VR, AR, Autonomous Driving sims). 
          The files are larger (GBs), but the ability to render photorealism at 120 FPS is a game-changer we haven't seen in decades.
        </p>
      </div>
    )
  },
  {
    id: 5,
    title: "The Matrix for Cars: Why Simulation is King",
    date: "March 2025",
    preview: "You can't drive a real car off a cliff a thousand times to see what happens. But in a simulator? You can do it before breakfast.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          Waymo and Cruise have driven millions of miles in the real world. That sounds impressive, but in the grand scheme of 
          statistics, it's nothing. To prove an autonomous vehicle is statistically safer than a human, you need billions of miles of validation.
          Driving that physically would take centuries.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          We can't wait 500 years. So, we enter the Matrix.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Long Tail Problem</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Driving on a sunny highway is easy. Driving when a mattress falls off the truck in front of you while it's hailing 
          and a kangaroo jumps out? That's an "edge case."
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          These edge cases are rare in real life (the "Long Tail" of data distributions), but they are where accidents happen. 
          In a simulator (like CARLA or proprietary engines), we can script these scenarios. We can make it rain mattresses 
          all day long until the AI learns how to dodge them.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Sim-to-Real Gap</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          The challenge is the "Sim-to-Real gap." If the physics in the simulator aren't perfect, or the lighting looks slightly "video game-y," 
          the AI might overfit to the simulation. It learns to play the game, not drive the car.
          This leads to the comical situation of an AI being a perfect driver in the simulator but crashing instantly in the real world because 
          shadows look different.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Data Flywheel</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Modern development works in a loop:
        </p>
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 font-mono text-sm text-blue-300 mb-4">
           Real cars collect data &rarr; We build a sim from that data &rarr; We train the AI in the sim &rarr; We deploy better AI to real cars.
        </div>
        <p className="text-gray-300 leading-relaxed">
          This is known as <strong>Re-Simulation</strong>. We take a real log where the car made a mistake, 
          turn it into a simulation, and then run it thousands of times with slight variations (different weather, slightly different timing) 
          to ensure the new code actually fixed the problem.
        </p>
      </div>
    )
  }
];

  // --- Three.js Setup ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    // Soft distant fog: doesn't wash out foreground buildings
    scene.fog = new THREE.Fog(0x0a0a15, 120, 450);
    sceneRef.current = scene;

    const container = canvasRef.current.parentElement;
    const initialWidth = container ? container.clientWidth : 800;
    const initialHeight = container ? container.clientHeight : 800;

    // FOV 50 gives a cinematic, comfortable perspective with generous vertical headroom
    const camera = new THREE.PerspectiveCamera(50, initialWidth / initialHeight, 0.1, 800);
    // Courtyard elevated vantage point looking at Home Base
    camera.position.set(0, 48, -21);
    camera.lookAt(0, 2, -60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a15, 1);

    // Responsive Resize Observer
    const handleResize = () => {
      if (!container || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    if (container) {
      resizeObserver.observe(container);
    }

    const ambientLight = new THREE.AmbientLight(0x505070, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a2035, 0.7);
    hemiLight.position.set(0, 100, 0);
    scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(50, 90, 50);
    directionalLight.castShadow = true;
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
    const groundGeometry = new THREE.PlaneGeometry(600, 600);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0f1419,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(600, 120, 0x1a4d6f, 0x0d2433);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // --- Roads Setup with Curved Corner Meshes ---
    const roadWidth = 8;
    const cornerRadius = 8;
    const halfWidth = roadWidth / 2; // 4
    const innerRadius = cornerRadius - halfWidth; // 4
    const outerRadius = cornerRadius + halfWidth; // 12
    const cornerCenterOffset = 52;

    const textureLoader = new THREE.TextureLoader();
    const roadTexture = textureLoader.load('/assets/road_straight.png');
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      map: roadTexture,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    // 4 Straight road segments
    const straightRoads = [
      // North side (z = -60)
      { from: { x: -cornerCenterOffset, z: -60 }, to: { x: cornerCenterOffset, z: -60 } },
      // East side (x = 60)
      { from: { x: 60, z: -cornerCenterOffset }, to: { x: 60, z: cornerCenterOffset } },
      // South side (z = 60)
      { from: { x: cornerCenterOffset, z: 60 }, to: { x: -cornerCenterOffset, z: 60 } },
      // West side (x = -60)
      { from: { x: -60, z: cornerCenterOffset }, to: { x: -60, z: -cornerCenterOffset } },
    ];

    straightRoads.forEach(road => {
      const dx = road.to.x - road.from.x;
      const dz = road.to.z - road.from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const repeatY = length / roadWidth;
      const geometry = new THREE.PlaneGeometry(roadWidth, length);
      const material = roadMaterial.clone();
      material.map = roadTexture.clone();
      material.map.repeat.set(1, repeatY);
      material.map.needsUpdate = true;

      const roadMesh = new THREE.Mesh(geometry, material);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -angle;
      roadMesh.position.set((road.from.x + road.to.x) / 2, 0.02, (road.from.z + road.to.z) / 2);
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);
    });

    // 4 Corner Curve Meshes
    const cornerConfigs = [
      // Bottom-Right Corner (Connecting x=60, z=52 to x=52, z=60)
      { cx: cornerCenterOffset, cz: cornerCenterOffset, startAngle: 0, endAngle: Math.PI / 2 },
      // Bottom-Left Corner (Connecting x=-52, z=60 to x=-60, z=52)
      { cx: -cornerCenterOffset, cz: cornerCenterOffset, startAngle: Math.PI / 2, endAngle: Math.PI },
      // Top-Left Corner (Connecting x=-60, z=-52 to x=-52, z=-60)
      { cx: -cornerCenterOffset, cz: -cornerCenterOffset, startAngle: Math.PI, endAngle: 3 * Math.PI / 2 },
      // Top-Right Corner (Connecting x=52, z=-60 to x=60, z=-52)
      { cx: cornerCenterOffset, cz: -cornerCenterOffset, startAngle: 3 * Math.PI / 2, endAngle: 2 * Math.PI },
    ];

    cornerConfigs.forEach(cfg => {
      const segments = 32;
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const arcLen = cornerRadius * Math.abs(cfg.endAngle - cfg.startAngle);
      const repeatV = arcLen / roadWidth;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = cfg.startAngle + t * (cfg.endAngle - cfg.startAngle);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        vertices.push(cfg.cx + innerRadius * cos, 0.02, cfg.cz + innerRadius * sin);
        vertices.push(cfg.cx + outerRadius * cos, 0.02, cfg.cz + outerRadius * sin);

        uvs.push(0, t * repeatV);
        uvs.push(1, t * repeatV);
      }

      for (let i = 0; i < segments; i++) {
        const i1 = i * 2;
        const i2 = i * 2 + 1;
        const i3 = (i + 1) * 2;
        const i4 = (i + 1) * 2 + 1;

        indices.push(i1, i2, i3);
        indices.push(i2, i4, i3);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const cornerMat = roadMaterial.clone();
      cornerMat.map = roadTexture.clone();
      cornerMat.map.wrapS = THREE.RepeatWrapping;
      cornerMat.map.wrapT = THREE.RepeatWrapping;
      cornerMat.map.repeat.set(1, 1);
      cornerMat.map.needsUpdate = true;

      const cornerMesh = new THREE.Mesh(geometry, cornerMat);
      cornerMesh.receiveShadow = true;
      scene.add(cornerMesh);
    });

    // 4 Roadside Destinations (Buildings, Sidewalks, Windows, Stop Markings)
    DESTINATIONS.forEach(dest => {
      const group = new THREE.Group();
      
      // Building Box
      const bGeo = new THREE.BoxGeometry(12, dest.height, 12);
      const bMat = new THREE.MeshStandardMaterial({ 
        color: dest.buildingColor, 
        roughness: 0.6,
        metalness: 0.2
      });
      const building = new THREE.Mesh(bGeo, bMat);
      building.position.set(dest.position3D.x, dest.height / 2, dest.position3D.z);
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      // Rooftop Accent
      const roofGeo = new THREE.BoxGeometry(12.4, 0.4, 12.4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(dest.position3D.x, dest.height + 0.2, dest.position3D.z);
      group.add(roof);

      const isNorth = dest.id === 'home';
      const isEast = dest.id === 'publications';
      const isSouth = dest.id === 'blog';
      const isWest = dest.id === 'about';

      // Concrete Sidewalk in front of building entrance
      const walkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      let walkGeo;
      let walkPos = { x: dest.position3D.x, y: 0.04, z: dest.position3D.z };

      if (isNorth) {
        walkGeo = new THREE.BoxGeometry(16, 0.08, 4);
        walkPos = { x: 0, y: 0.04, z: -66 };
      } else if (isSouth) {
        walkGeo = new THREE.BoxGeometry(16, 0.08, 4);
        walkPos = { x: 0, y: 0.04, z: 66 };
      } else if (isEast) {
        walkGeo = new THREE.BoxGeometry(4, 0.08, 16);
        walkPos = { x: 66, y: 0.04, z: 0 };
      } else { // West
        walkGeo = new THREE.BoxGeometry(4, 0.08, 16);
        walkPos = { x: -66, y: 0.04, z: 0 };
      }
      const sidewalk = new THREE.Mesh(walkGeo, walkMat);
      sidewalk.position.set(walkPos.x, walkPos.y, walkPos.z);
      sidewalk.receiveShadow = true;
      group.add(sidewalk);

      // Windows on front facade facing road
      const winMat = new THREE.MeshStandardMaterial({ 
        color: 0x60a5fa, 
        emissive: 0x60a5fa, 
        emissiveIntensity: 0.6 
      });
      for (let floor = 0; floor < Math.floor(dest.height / 3); floor++) {
        for (let col = -1; col <= 1; col++) {
          const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.2), winMat);
          const y = 3 + floor * 2.8;
          if (isNorth) {
            w.position.set(dest.position3D.x + col * 3, y, dest.position3D.z + 6.1);
          } else if (isSouth) {
            w.position.set(dest.position3D.x + col * 3, y, dest.position3D.z - 6.1);
          } else if (isEast) {
            w.rotation.y = Math.PI / 2;
            w.position.set(dest.position3D.x - 6.1, y, dest.position3D.z + col * 3);
          } else { // West
            w.rotation.y = Math.PI / 2;
            w.position.set(dest.position3D.x + 6.1, y, dest.position3D.z + col * 3);
          }
          group.add(w);
        }
      }

      // Parking / Stop Box painted on road
      const stopLineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const stopBoxGeo = new THREE.PlaneGeometry(7, 5);
      const stopBox = new THREE.Mesh(stopBoxGeo, stopLineMat);
      stopBox.rotation.x = -Math.PI / 2;
      if (isEast || isWest) stopBox.rotation.z = Math.PI / 2;
      stopBox.position.set(dest.stopPosition.x, 0.025, dest.stopPosition.z);
      group.add(stopBox);

      scene.add(group);
      buildingsRef.current.push(group);
    });

    // Vehicle
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.7, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x1a4d8f, metalness: 0.8, roughness: 0.3 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.8, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
    );
    cabin.position.y = 1.25;
    cabin.position.z = -0.4;
    cabin.castShadow = true;
    car.add(cabin);

    // Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    hl1.position.set(0.7, 0.55, 2.21);
    car.add(hl1);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    hl2.position.set(-0.7, 0.55, 2.21);
    car.add(hl2);

    // Initial Position (Parked at Home Base: x=0, z=-60, facing East along circuit)
    car.position.set(0, 0.1, -60);
    car.rotation.y = Math.PI / 2;

    carRef.current = car;
    scene.add(car);

    // Render Loop
    let frame = 0;
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame++;
      
      if (!isNavigating && carRef.current) {
        carRef.current.position.y = 0.1 + Math.sin(frame * 0.03) * 0.03;
      } else if (carRef.current) {
        carRef.current.position.y = 0.1;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // --- Navigation Logic ---
  const navigateTo = (destination: any) => {
    if (isNavigating) return;
    if (currentPosition.id === destination.id) {
      setSelectedDestination(destination);
      return;
    }

    const routePath = computeRoute(currentPosition.id, destination.id);
    if (!routePath || routePath.length < 2) return;

    setCurrentRoute({ path: routePath, destination });
    setIsNavigating(true);
    setCurrentPosition(destination);
  };

  // --- Animation Loop for Movement ---
  useEffect(() => {
    if (!isNavigating || currentRoute.path.length === 0) return;

    const SPEED = 0.55;
    const ROTATION_SPEED = 0.14;
    let currentSegmentIndex = 0;
    let animId: number;

    const animateMovement = () => {
      if (!carRef.current) return;
      
      const path = currentRoute.path;
      if (currentSegmentIndex >= path.length - 1) {
        // Reached destination
        setIsNavigating(false);
        setNavigationProgress(1);
        setTimeout(() => setSelectedDestination(currentRoute.destination), 500);
        return;
      }

      const isFinalSegment = currentSegmentIndex === path.length - 2;
      const target = path[currentSegmentIndex + 1];
      const current = carRef.current.position;

      // 1. Calculate direction to target
      const dx = target.x - current.x;
      const dz = target.z - current.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // 2. Determine target angle
      const targetRotation = Math.atan2(dx, dz);
      
      // 3. Smoothly rotate car towards target
      let rotDiff = targetRotation - carRef.current.rotation.y;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      
      carRef.current.rotation.y += rotDiff * ROTATION_SPEED;

      // 4. Move car forward
      if (Math.abs(rotDiff) < 0.8) {
        const currentSpeed = isFinalSegment 
          ? Math.max(0.12, Math.min(SPEED, dist * 0.22))
          : SPEED;
        const moveStep = Math.min(currentSpeed, dist);
        carRef.current.position.x += (dx / dist) * moveStep;
        carRef.current.position.z += (dz / dist) * moveStep;

        const totalSegments = path.length - 1;
        const segmentLen = Math.hypot(
          path[currentSegmentIndex + 1].x - path[currentSegmentIndex].x,
          path[currentSegmentIndex + 1].z - path[currentSegmentIndex].z
        );
        const segmentProgress = segmentLen > 0.01 ? 1 - (dist / segmentLen) : 1;
        
        setNavigationProgress(
          Math.min(1, (currentSegmentIndex + segmentProgress) / totalSegments)
        );

        if (isFinalSegment && dist < 0.25) {
          carRef.current.position.x = target.x;
          carRef.current.position.z = target.z;
          if (target.heading !== undefined) {
            carRef.current.rotation.y = target.heading;
          }
          currentSegmentIndex++;
          setIsNavigating(false);
          setNavigationProgress(1);
          setTimeout(() => setSelectedDestination(currentRoute.destination), 500);
          return;
        } else if (!isFinalSegment && dist < 0.8) {
          currentSegmentIndex++;
        }
      }

      // Camera Follow Logic (Inside-out elevated view from courtyard)
      if (cameraRef.current && carRef.current) {
        const carX = carRef.current.position.x;
        const carZ = carRef.current.position.z;
        if (!isNaN(carX) && !isNaN(carZ)) {
          // Camera stays elevated inside the central courtyard
          const targetCamX = carX * 0.35;
          const targetCamZ = carZ * 0.35;
          const targetCamY = 48;
          cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.05;
          cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.05;
          cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.05;
          cameraRef.current.lookAt(carX, 2, carZ);
        }
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
      <div className="w-full max-w-7xl h-[850px] bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
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
            
            {/* 2. Destination List */}
            <div className="p-4 space-y-3 bg-slate-900 flex-1 overflow-y-auto">
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
                    <div className="text-xs text-slate-500 mt-0.5">Coords: {dest.stopPosition.x}, {dest.stopPosition.z}</div>
                  </div>
                  {currentPosition.id === dest.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
                </button>
              ))}
            </div>
          </div>
          
          {/* --- 3D Viewport --- */}
          <div className="col-span-3 bg-[#0a0a15] relative w-full h-full overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full block cursor-default" />
            
            {/* Overlay UI: Status Badge */}
            <div className="absolute top-6 left-6 pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm font-mono shadow-lg">
                SYS.STATUS: {isNavigating ? 'NAVIGATING' : 'IDLE'}
              </div>
            </div>

            {/* Circular Minimap Overlay (Top-Right) */}
            <div className="absolute top-6 right-6 w-48 h-48 rounded-full overflow-hidden border-2 border-slate-700 shadow-2xl bg-[#0f1419]">
              <VectorMap
                currentPosition={currentPosition}
                destinations={DESTINATIONS}
                roads={ROADS}
                isNavigating={isNavigating}
                navigationProgress={navigationProgress}
                currentRoute={currentRoute}
              />
            </div>

            {/* Status Pill (Bottom-Center) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 flex items-center gap-3 shadow-xl pointer-events-none">
              <div className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
              <span className="text-slate-200 text-sm font-medium">
                {isNavigating ? "Autonomous Mode Active..." : "Vehicle Parked"}
              </span>
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