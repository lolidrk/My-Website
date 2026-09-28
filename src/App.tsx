import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, User, Home, Navigation2, Compass, RotateCcw, Map as MapIcon, Car, Layers } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { blogPosts, type BlogPost } from './data/blogPosts';

// --- Types & Constants ---
export interface Waypoint {
  name?: string;
  x: number;
  z: number;
  heading?: number;
}

export interface DestinationItem {
  id: string;
  name: string;
  sector: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  coords: { lat: number; lng: number };
  position3D: { x: number; z: number };
  stopPosition: { x: number; z: number };
  defaultHeading: number;
  color: string;
  buildingColor: number;
  height: number;
  camOffset: { x: number; y: number; z: number };
  email?: string;
}

// 4 Destinations mapped to Indiranagar Arterials (100 Feet Rd & 80 Feet Rd)
const DESTINATIONS: DestinationItem[] = [
  { 
    id: 'home', 
    name: 'Home Base', 
    sector: '100 FT RD // CMH JCT',
    icon: Home, 
    coords: { lat: 12.9784, lng: 77.6408 },
    position3D: { x: -58, z: -105 },
    stopPosition: { x: -80, z: -105 },
    defaultHeading: Math.PI, // Facing South down 100 Feet Road
    color: '#00f0ff',
    buildingColor: 0x00f0ff,
    height: 18,
    camOffset: { x: -40, y: 24, z: -80 }
  },
  { 
    id: 'publications', 
    name: 'Publications Hub', 
    sector: '80 FT RD // RESEARCH LAB',
    icon: FileText, 
    coords: { lat: 12.9730, lng: 77.6520 },
    position3D: { x: 104, z: -10 },
    stopPosition: { x: 80, z: -10 },
    defaultHeading: Math.PI, // Facing South down 80 Feet Road
    color: '#10b981',
    buildingColor: 0x10b981,
    height: 26,
    camOffset: { x: 40, y: 28, z: -10 }
  },
  { 
    id: 'blog', 
    name: 'Blog Tower', 
    sector: '100 FT RD // 12TH MAIN',
    icon: BookOpen, 
    coords: { lat: 12.9640, lng: 77.6415 },
    position3D: { x: -58, z: 105 },
    stopPosition: { x: -80, z: 105 },
    defaultHeading: Math.PI, // Facing South down 100 Feet Road
    color: '#f59e0b',
    buildingColor: 0xf59e0b,
    height: 38,
    camOffset: { x: -40, y: 32, z: 75 }
  },
  { 
    id: 'about', 
    name: 'About Plaza', 
    sector: '100 FT RD // DEFENCE COLONY',
    icon: User, 
    coords: { lat: 12.9710, lng: 77.6395 },
    position3D: { x: -104, z: 45 },
    stopPosition: { x: -80, z: 45 },
    defaultHeading: Math.PI, // Facing South down 100 Feet Road
    color: '#8b5cf6',
    buildingColor: 0x8b5cf6,
    height: 16,
    camOffset: { x: -45, y: 24, z: 45 },
    email: 'kalyanikulkarni2002@gmail.com'
  },
];

// Helper to generate smooth circular corner arcs for car turning
const generateCornerArc = (
  cx: number, cz: number,
  r: number,
  startAngle: number, endAngle: number,
  steps: number = 6
): Waypoint[] => {
  const pts: Waypoint[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const a = startAngle + t * (endAngle - startAngle);
    pts.push({
      x: cx + r * Math.cos(a),
      z: cz + r * Math.sin(a),
    });
  }
  return pts;
};

// Route calculator across Indiranagar Grid (100 Ft Rd, 80 Ft Rd, 2nd Main, 6th Main)
const computeCityRoute = (fromId: string, toId: string): Waypoint[] => {
  if (fromId === toId) return [];

  // Corner arcs with radius R=8
  // 100 Ft Rd (-80) & 2nd Main (-80)
  const turn100To2ndMainEast = generateCornerArc(-72, -88, 8, Math.PI, Math.PI / 2); // S to E
  const turn2ndMainTo100North = generateCornerArc(-72, -88, 8, Math.PI / 2, Math.PI); // W to N

  // 80 Ft Rd (80) & 2nd Main (-80)
  const turn2ndMainTo80South = generateCornerArc(72, -72, 8, -Math.PI / 2, 0); // E to S
  const turn80To2ndMainWest = generateCornerArc(72, -72, 8, 0, -Math.PI / 2); // N to W

  // 100 Ft Rd (-80) & 6th Main (15)
  const turn100To6thMainEast = generateCornerArc(-72, 23, 8, Math.PI, 3 * Math.PI / 2); // N to E
  const turn6thMainTo100South = generateCornerArc(-72, 23, 8, 3 * Math.PI / 2, Math.PI); // W to S

  // 80 Ft Rd (80) & 6th Main (15)
  const turn6thMainTo80North = generateCornerArc(72, 7, 8, Math.PI / 2, 0); // E to N
  const turn80To6thMainWest = generateCornerArc(72, 7, 8, 0, Math.PI / 2); // S to W

  const routes: Record<string, Waypoint[]> = {
    // 1. Home -> About (Straight South down 100 Feet Road)
    'home->about': [
      { x: -80, z: -105 },
      { x: -80, z: -80 },
      { x: -80, z: 0 },
      { x: -80, z: 45, heading: Math.PI }
    ],
    // 2. About -> Blog (Straight South down 100 Feet Road)
    'about->blog': [
      { x: -80, z: 45 },
      { x: -80, z: 75 },
      { x: -80, z: 105, heading: Math.PI }
    ],
    // 3. Home -> Blog (Straight South down 100 Feet Road)
    'home->blog': [
      { x: -80, z: -105 },
      { x: -80, z: -40 },
      { x: -80, z: 45 },
      { x: -80, z: 105, heading: Math.PI }
    ],

    // 4. Blog -> About (Straight North up 100 Feet Road)
    'blog->about': [
      { x: -80, z: 105 },
      { x: -80, z: 75 },
      { x: -80, z: 45, heading: 0 }
    ],
    // 5. About -> Home (Straight North up 100 Feet Road)
    'about->home': [
      { x: -80, z: 45 },
      { x: -80, z: -40 },
      { x: -80, z: -105, heading: 0 }
    ],
    // 6. Blog -> Home (Straight North up 100 Feet Road)
    'blog->home': [
      { x: -80, z: 105 },
      { x: -80, z: 45 },
      { x: -80, z: -40 },
      { x: -80, z: -105, heading: 0 }
    ],

    // 7. Home -> Publications (100 Ft Rd -> 2nd Main across Defence Colony Park -> 80 Ft Rd)
    'home->publications': [
      { x: -80, z: -105 },
      { x: -80, z: -88 },
      ...turn100To2ndMainEast,
      { x: -72, z: -80 },
      { x: 0, z: -80 }, // Passing north of Defence Colony Park
      { x: 72, z: -80 },
      ...turn2ndMainTo80South,
      { x: 80, z: -72 },
      { x: 80, z: -10, heading: Math.PI }
    ],
    // 8. Publications -> Home (80 Ft Rd -> 2nd Main across Defence Colony Park -> 100 Ft Rd)
    'publications->home': [
      { x: 80, z: -10 },
      { x: 80, z: -72 },
      ...turn80To2ndMainWest,
      { x: 72, z: -80 },
      { x: 0, z: -80 }, // Passing north of Defence Colony Park
      { x: -72, z: -80 },
      ...turn2ndMainTo100North,
      { x: -80, z: -88 },
      { x: -80, z: -105, heading: 0 }
    ],

    // 9. About -> Publications (100 Ft Rd -> 6th Main -> 80 Ft Rd)
    'about->publications': [
      { x: -80, z: 45 },
      { x: -80, z: 23 },
      ...turn100To6thMainEast,
      { x: -72, z: 15 },
      { x: 0, z: 15 }, // Driving across 6th Main
      { x: 72, z: 15 },
      ...turn6thMainTo80North,
      { x: 80, z: 7 },
      { x: 80, z: -10, heading: 0 }
    ],
    // 10. Publications -> About (80 Ft Rd -> 6th Main -> 100 Ft Rd)
    'publications->about': [
      { x: 80, z: -10 },
      { x: 80, z: 7 },
      ...turn80To6thMainWest,
      { x: 72, z: 15 },
      { x: 0, z: 15 }, // Driving across 6th Main
      { x: -72, z: 15 },
      ...turn6thMainTo100South,
      { x: -80, z: 23 },
      { x: -80, z: 45, heading: Math.PI }
    ],

    // 11. Blog -> Publications (100 Ft Rd North -> 6th Main East -> 80 Ft Rd)
    'blog->publications': [
      { x: -80, z: 105 },
      { x: -80, z: 23 },
      ...turn100To6thMainEast,
      { x: -72, z: 15 },
      { x: 0, z: 15 },
      { x: 72, z: 15 },
      ...turn6thMainTo80North,
      { x: 80, z: 7 },
      { x: 80, z: -10, heading: 0 }
    ],
    // 12. Publications -> Blog (80 Ft Rd South -> 6th Main West -> 100 Ft Rd South)
    'publications->blog': [
      { x: 80, z: -10 },
      { x: 80, z: 7 },
      ...turn80To6thMainWest,
      { x: 72, z: 15 },
      { x: 0, z: 15 },
      { x: -72, z: 15 },
      ...turn6thMainTo100South,
      { x: -80, z: 23 },
      { x: -80, z: 105, heading: Math.PI }
    ],
  };

  return routes[`${fromId}->${toId}`] || [];
};

// --- Plots of Land Layout (Strictly inside block corridors - NO road overlap) ---
export interface LandPlot {
  id: string;
  name?: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  type: 'hero' | 'park' | 'cantilever' | 'stepped' | 'wedge' | 'spire' | 'commercial' | 'lowrise';
  heroId?: string;
}

// Generate the Indiranagar urban plot grid
const generateLandPlots = (): LandPlot[] => {
  const plots: LandPlot[] = [];

  // Column boundaries (X corridors for roads at X = -130, -80, -40, 0, 40, 80, 130)
  // Col 1: [-125, -86], Col 2: [-74, -45], Col 3: [-35, -5], Col 4: [5, 35], Col 5: [45, 74], Col 6: [86, 125]
  // Row boundaries (Z corridors for roads at Z = -130, -80, -35, 15, 75, 130)
  // Row 1: [-125, -85], Row 2: [-75, -40], Row 3: [-30, 10], Row 4: [20, 70], Row 5: [80, 125]

  // 1. HERO DESTINATION PLOTS
  plots.push({
    id: 'hero_home',
    name: 'Home Base Terminal',
    minX: -74, maxX: -45,
    minZ: -125, maxZ: -85,
    type: 'hero',
    heroId: 'home'
  });
  plots.push({
    id: 'hero_publications',
    name: 'Publications Hub Campus',
    minX: 86, maxX: 125,
    minZ: -30, maxZ: 10,
    type: 'hero',
    heroId: 'publications'
  });
  plots.push({
    id: 'hero_blog',
    name: 'Blog Tower Plaza',
    minX: -74, maxX: -45,
    minZ: 80, maxZ: 125,
    type: 'hero',
    heroId: 'blog'
  });
  plots.push({
    id: 'hero_about',
    name: 'About Plaza Pavilion',
    minX: -125, maxX: -86,
    minZ: 20, maxZ: 70,
    type: 'hero',
    heroId: 'about'
  });

  // 2. PARKS & GREEN SPACES (Directly inspired by Indiranagar OpenStreetMap)
  // A. Defence Colony Park (Large prominent park in Row 2, spanning Col 3 & 4)
  plots.push({
    id: 'park_defence_colony',
    name: 'Defence Colony Park',
    minX: -35, maxX: 35,
    minZ: -75, maxZ: -40,
    type: 'park'
  });
  // B. Defence Colony Playground & Children's Park (Row 3, Col 4)
  plots.push({
    id: 'park_defence_playground',
    name: "Defence Colony Playground",
    minX: 5, maxX: 35,
    minZ: -30, maxZ: 10,
    type: 'park'
  });
  // C. Indiranagar Club Park (Row 4, Col 3)
  plots.push({
    id: 'park_indiranagar_club',
    name: 'Indiranagar Club Park',
    minX: -35, maxX: -5,
    minZ: 20, maxZ: 70,
    type: 'park'
  });
  // D. BDA Public Park (Row 3, Col 1 - West of 100 Feet Road)
  plots.push({
    id: 'park_bda',
    name: 'BDA Public Park',
    minX: -125, maxX: -86,
    minZ: -30, maxZ: 10,
    type: 'park'
  });
  // E. Eastside Green Park (Row 2, Col 6 - East of 80 Feet Road)
  plots.push({
    id: 'park_eastside',
    name: 'Eastside Green Reserve',
    minX: 86, maxX: 125,
    minZ: -75, maxZ: -40,
    type: 'park'
  });

  // 3. WIREFRAME CYBERPUNK SKYSCRAPERS & COMMERCIAL PLOTS (Picture 1 style)
  // Cantilever Towers
  plots.push({ id: 'bld_cant_1', minX: -125, maxX: -86, minZ: -125, maxZ: -85, type: 'cantilever' });
  plots.push({ id: 'bld_cant_2', minX: 45, maxX: 74, minZ: 20, maxZ: 70, type: 'cantilever' });
  plots.push({ id: 'bld_cant_3', minX: 86, maxX: 125, minZ: -125, maxZ: -85, type: 'cantilever' });

  // Stepped Setback Towers
  plots.push({ id: 'bld_step_1', minX: -35, maxX: -5, minZ: -125, maxZ: -85, type: 'stepped' });
  plots.push({ id: 'bld_step_2', minX: 45, maxX: 74, minZ: -75, maxZ: -40, type: 'stepped' });
  plots.push({ id: 'bld_step_3', minX: -74, maxX: -45, minZ: 20, maxZ: 70, type: 'stepped' });
  plots.push({ id: 'bld_step_4', minX: 86, maxX: 125, minZ: 80, maxZ: 125, type: 'stepped' });

  // Slanted Wedge Towers
  plots.push({ id: 'bld_wedge_1', minX: 5, maxX: 35, minZ: -125, maxZ: -85, type: 'wedge' });
  plots.push({ id: 'bld_wedge_2', minX: -74, maxX: -45, minZ: -30, maxZ: 10, type: 'wedge' });
  plots.push({ id: 'bld_wedge_3', minX: 45, maxX: 74, minZ: 80, maxZ: 125, type: 'wedge' });

  // Spire Megatowers
  plots.push({ id: 'bld_spire_1', minX: 45, maxX: 74, minZ: -125, maxZ: -85, type: 'spire' });
  plots.push({ id: 'bld_spire_2', minX: 86, maxX: 125, minZ: 20, maxZ: 70, type: 'spire' });

  // Commercial Matrix Blocks with Glowing Windows
  plots.push({ id: 'bld_comm_1', minX: -125, maxX: -86, minZ: -75, maxZ: -40, type: 'commercial' });
  plots.push({ id: 'bld_comm_2', minX: -35, maxX: -5, minZ: -30, maxZ: 10, type: 'commercial' });
  plots.push({ id: 'bld_comm_3', minX: 5, maxX: 35, minZ: 20, maxZ: 70, type: 'commercial' });
  plots.push({ id: 'bld_comm_4', minX: -125, maxX: -86, minZ: 80, maxZ: 125, type: 'commercial' });
  plots.push({ id: 'bld_comm_5', minX: -35, maxX: -5, minZ: 80, maxZ: 125, type: 'commercial' });
  plots.push({ id: 'bld_comm_6', minX: 5, maxX: 35, minZ: 80, maxZ: 125, type: 'commercial' });

  return plots;
};

// --- Vector 2D Map Component (Indiranagar OpenStreetMap Layout) ---
interface VectorMapProps {
  currentPosition: DestinationItem;
  destinations: DestinationItem[];
  isNavigating: boolean;
  navigationProgress: number;
  currentRoute: {
    path: Waypoint[];
    destination: DestinationItem | null;
  };
  plots: LandPlot[];
}

const VectorMap: React.FC<VectorMapProps> = ({ currentPosition, destinations, isNavigating, navigationProgress, currentRoute, plots }) => {
  const viewBoxSize = 320;
  const offset = viewBoxSize / 2;

  const getCarPosition = () => {
    if (!isNavigating || !currentRoute.path || currentRoute.path.length === 0) {
      return currentPosition.stopPosition || { x: -80, z: -105 };
    }
    const totalSegments = currentRoute.path.length - 1;
    if (totalSegments <= 0) return currentPosition.stopPosition || { x: -80, z: -105 };

    const progressPerSegment = 1 / totalSegments;
    const currentSegmentIndex = Math.min(
      Math.floor(navigationProgress / progressPerSegment),
      totalSegments - 1
    );
    const segmentProgress = (navigationProgress - (currentSegmentIndex * progressPerSegment)) / progressPerSegment;

    const p1 = currentRoute.path[currentSegmentIndex];
    const p2 = currentRoute.path[currentSegmentIndex + 1];
    if (!p1 || !p2) return currentPosition.stopPosition || { x: -80, z: -105 };

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
    <div className="w-full h-full bg-[#050811] relative overflow-hidden select-none">
      <svg 
        viewBox={`-${offset} -${offset} ${viewBoxSize} ${viewBoxSize}`} 
        className="w-full h-full"
        style={{ padding: '8px' }}
      >
        {/* Render Plots of Land (Cadastral Blocks) */}
        {plots && plots.map((p: LandPlot) => (
          <g key={p.id}>
            <rect
              x={p.minX}
              y={p.minZ}
              width={p.maxX - p.minX}
              height={p.maxZ - p.minZ}
              fill={p.type === 'park' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(8, 14, 26, 0.75)'}
              stroke={p.type === 'park' ? '#10b981' : '#22c55e'}
              strokeWidth={p.type === 'park' ? 1.4 : 0.75}
              strokeOpacity={0.65}
              rx={2}
            />
            {p.type === 'park' && (
              <text 
                x={(p.minX + p.maxX) / 2} 
                y={(p.minZ + p.maxZ) / 2 + 2} 
                textAnchor="middle" 
                fill="#34d399" 
                fontSize="5" 
                fontFamily="monospace"
                fontWeight="bold"
                opacity={0.8}
              >
                PARK
              </text>
            )}
          </g>
        ))}

        {/* Major Roads (Indiranagar Street Grid) */}
        {/* 100 Feet Road (Major Western Commercial Boulevard) */}
        <line x1="-80" y1="-130" x2="-80" y2="130" stroke="#00ff66" strokeWidth="2.5" opacity="0.9"/>
        <line x1="-80" y1="-130" x2="-80" y2="130" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.7"/>

        {/* 80 Feet Road (Major Eastern Boulevard) */}
        <line x1="80" y1="-130" x2="80" y2="130" stroke="#00ff66" strokeWidth="2.5" opacity="0.9"/>
        <line x1="80" y1="-130" x2="80" y2="130" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.7"/>

        {/* CMH Road (North Arterial) */}
        <line x1="-130" y1="-130" x2="130" y2="-130" stroke="#00ff66" strokeWidth="2" opacity="0.8"/>
        {/* 12th Main Road (South Arterial) */}
        <line x1="-130" y1="130" x2="130" y2="130" stroke="#00ff66" strokeWidth="2" opacity="0.8"/>

        {/* Main Connecting Roads (Horizontal East-West) */}
        {/* 2nd Main Road (Passing north of Defence Colony Park) */}
        <line x1="-130" y1="-80" x2="130" y2="-80" stroke="#22c55e" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.7"/>
        {/* 5th Main Road */}
        <line x1="-130" y1="-35" x2="130" y2="-35" stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6"/>
        {/* 6th Main Road */}
        <line x1="-130" y1="15" x2="130" y2="15" stroke="#22c55e" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.7"/>
        {/* 9th Main Road */}
        <line x1="-130" y1="75" x2="130" y2="75" stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6"/>

        {/* Cross Streets (Vertical North-South) */}
        <line x1="-130" y1="-130" x2="-130" y2="130" stroke="#15803d" strokeWidth="1.2" opacity="0.5"/>
        <line x1="-40" y1="-130" x2="-40" y2="130" stroke="#15803d" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
        <line x1="0" y1="-130" x2="0" y2="130" stroke="#15803d" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
        <line x1="40" y1="-130" x2="40" y2="130" stroke="#15803d" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
        <line x1="130" y1="-130" x2="130" y2="130" stroke="#15803d" strokeWidth="1.2" opacity="0.5"/>

        {/* Street Name Labels */}
        <text x="-80" y="-134" textAnchor="middle" fill="#00ff66" fontSize="5" fontWeight="bold">100 FT RD</text>
        <text x="80" y="-134" textAnchor="middle" fill="#00ff66" fontSize="5" fontWeight="bold">80 FT RD</text>
        <text x="0" y="-133" textAnchor="middle" fill="#94a3b8" fontSize="4.5">CMH ROAD</text>
        <text x="0" y="-83" textAnchor="middle" fill="#94a3b8" fontSize="4">2ND MAIN</text>
        <text x="0" y="12" textAnchor="middle" fill="#94a3b8" fontSize="4">6TH MAIN</text>

        {/* Active Navigation Route */}
        {isNavigating && currentRoute.path && currentRoute.path.length > 1 && (
          <polyline
            points={currentRoute.path.map((pt: Waypoint) => `${pt.x},${pt.z}`).join(' ')}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        )}

        {/* Destination Markers */}
        {destinations.map((dest: DestinationItem) => (
          <g key={dest.id} transform={`translate(${dest.stopPosition.x}, ${dest.stopPosition.z})`}>
            <circle r="7" fill={dest.color} opacity="0.25" />
            <circle r="4" fill={dest.color} stroke="#ffffff" strokeWidth="1.2" />
            <text 
              y={dest.stopPosition.z < -50 ? -8 : 13} 
              textAnchor="middle" 
              fill="#ffffff" 
              fontSize="7" 
              fontWeight="bold"
              style={{ textShadow: '0px 1px 3px black' }}
            >
              {dest.name}
            </text>
          </g>
        ))}

        {/* Car Puck */}
        <g transform={`translate(${carPos.x}, ${carPos.z}) rotate(${rotation})`}>
          <circle r="6" fill="#00f0ff" opacity="0.35" />
          <circle r="4.2" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 0 -8 L 3.5 -3 L -3.5 -3 Z" fill="#00f0ff" />
        </g>
      </svg>
      
      <div className="absolute top-2.5 right-2.5">
        <div className="bg-slate-900/90 p-1.5 rounded-full border border-slate-700 shadow text-cyan-400">
          <Compass size={14} />
        </div>
      </div>
    </div>
  );
};

// --- Procedural Canvas Road Texture Generators ---
// 1. Vertical Road Texture (for 100 Feet Rd, 80 Feet Rd, and Cross streets)
const createVerticalRoadTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, 128, 256);

  // Subtle grain
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }

  // Glowing neon green edge curbs
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(3, 0); ctx.lineTo(3, 256);
  ctx.moveTo(125, 0); ctx.lineTo(125, 256);
  ctx.stroke();

  // Center dashed green line
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 6;
  ctx.setLineDash([28, 20]);
  ctx.beginPath();
  ctx.moveTo(64, 0); ctx.lineTo(64, 256);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

// 2. Horizontal Road Texture (for CMH Rd, 2nd Main, 6th Main, 12th Main)
const createHorizontalRoadTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(Math.random() * 256, Math.random() * 128, 2, 2);
  }

  // Glowing neon green top & bottom curbs
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, 3); ctx.lineTo(256, 3);
  ctx.moveTo(0, 125); ctx.lineTo(256, 125);
  ctx.stroke();

  // Center dashed green line
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 6;
  ctx.setLineDash([28, 20]);
  ctx.beginPath();
  ctx.moveTo(0, 64); ctx.lineTo(256, 64);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

const createCyberSignTexture = (text: string, subtext: string, colorHex: string): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = 'rgba(6, 10, 22, 0.96)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 14;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  // Corner brackets
  ctx.fillStyle = colorHex;
  ctx.fillRect(2, 2, 20, 5);
  ctx.fillRect(2, 2, 5, 20);
  ctx.fillRect(canvas.width - 22, 2, 20, 5);
  ctx.fillRect(canvas.width - 7, 2, 5, 20);
  ctx.fillRect(2, canvas.height - 7, 20, 5);
  ctx.fillRect(2, canvas.height - 22, 5, 20);
  ctx.fillRect(canvas.width - 22, canvas.height - 7, 20, 5);
  ctx.fillRect(canvas.width - 7, canvas.height - 22, 5, 20);

  ctx.shadowBlur = 12;
  ctx.shadowColor = colorHex;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, 58);

  ctx.shadowBlur = 8;
  ctx.fillStyle = colorHex;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(subtext, canvas.width / 2, 102);

  return new THREE.CanvasTexture(canvas);
};

const createBillboardMesh = (width: number, height: number, text: string, subtext: string, colorHex: string): THREE.Mesh => {
  const geo = new THREE.PlaneGeometry(width, height);
  const tex = createCyberSignTexture(text, subtext, colorHex);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
};

// --- Main AutonomousBlog Application ---
const AutonomousBlog = () => {
  const [selectedDestination, setSelectedDestination] = useState<DestinationItem | null>(DESTINATIONS[0]);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'topDown' | 'follow' | 'hero'>('topDown');
  const [currentPosition, setCurrentPosition] = useState<DestinationItem>(DESTINATIONS[0]);

  const [currentRoute, setCurrentRoute] = useState<{
    path: Waypoint[];
    destination: DestinationItem | null;
  }>({
    path: [],
    destination: null
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const carRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isResettingCameraRef = useRef<boolean>(false);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 260, 0));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const animatedPropsRef = useRef<{
    v2xRings: THREE.Mesh[];
    radarDishes: (THREE.Mesh | THREE.Group)[];
    holoOrb: THREE.Mesh | null;
    blinkingLights: THREE.Mesh[];
    lidarPuck: THREE.Mesh | null;
  }>({
    v2xRings: [],
    radarDishes: [],
    holoOrb: null,
    blinkingLights: [],
    lidarPuck: null,
  });

  const cityPlots = useRef<LandPlot[]>(generateLandPlots());

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  // --- Three.js Setup & World Generation ---
  useEffect(() => {
    if (!canvasRef.current) return;

    animatedPropsRef.current = {
      v2xRings: [],
      radarDishes: [],
      holoOrb: null,
      blinkingLights: [],
      lidarPuck: null,
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050811, 180, 520);
    sceneRef.current = scene;

    const container = canvasRef.current.parentElement;
    const initialWidth = container ? container.clientWidth : 800;
    const initialHeight = container ? container.clientHeight : 800;

    // Camera starts in TRUE TOP-DOWN map view (0, 260, 0) looking straight down at (0, 0, 0)
    const camera = new THREE.PerspectiveCamera(50, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(0, 260, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x050811, 1);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 380;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.update();
    controlsRef.current = controls;

    // Window resize observer
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
    if (container) resizeObserver.observe(container);

    // --- Cyberpunk Lighting ---
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x00ff66, 0x1e1b4b, 0.45);
    hemiLight.position.set(0, 160, 0);
    scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0x67e8f9, 1.25);
    directionalLight.position.set(90, 150, 70);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 600;
    directionalLight.shadow.camera.left = -180;
    directionalLight.shadow.camera.right = 180;
    directionalLight.shadow.camera.top = 180;
    directionalLight.shadow.camera.bottom = -180;
    scene.add(directionalLight);

    // --- Ground Grid Floor ---
    const groundGeometry = new THREE.PlaneGeometry(800, 800);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x04060d,
      roughness: 0.5,
      metalness: 0.4
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(800, 160, 0x00ff66, 0x0b1726);
    gridHelper.position.y = 0.01;
    const gridMat = gridHelper.material as THREE.Material;
    if (gridMat) {
      gridMat.transparent = true;
      gridMat.opacity = 0.16;
    }
    scene.add(gridHelper);

    // --- Indiranagar Road Grid Construction (Orthogonal & Clean) ---
    const vRoadTex = createVerticalRoadTexture();
    const hRoadTex = createHorizontalRoadTexture();

    const vRoadMat = new THREE.MeshStandardMaterial({ map: vRoadTex, roughness: 0.6, metalness: 0.3 });
    const hRoadMat = new THREE.MeshStandardMaterial({ map: hRoadTex, roughness: 0.6, metalness: 0.3 });

    // Helper for strictly vertical North-South roads
    const createVerticalRoad = (x: number, zStart: number, zEnd: number, width: number = 8) => {
      const len = Math.abs(zEnd - zStart);
      const zCenter = (zStart + zEnd) / 2;
      const geo = new THREE.PlaneGeometry(width, len);
      const mat = vRoadMat.clone();
      mat.map = vRoadTex.clone();
      mat.map.repeat.set(1, len / width);
      mat.map.needsUpdate = true;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.02, zCenter);
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    // Helper for strictly horizontal East-West roads
    const createHorizontalRoad = (z: number, xStart: number, xEnd: number, width: number = 8) => {
      const len = Math.abs(xEnd - xStart);
      const xCenter = (xStart + xEnd) / 2;
      const geo = new THREE.PlaneGeometry(len, width);
      const mat = hRoadMat.clone();
      mat.map = hRoadTex.clone();
      mat.map.repeat.set(len / width, 1);
      mat.map.needsUpdate = true;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(xCenter, 0.02, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    // 1. Primary Arterial Avenues (Vertical)
    createVerticalRoad(-80, -135, 135, 8.5); // 100 FEET ROAD (Major Commercial Arterial)
    createVerticalRoad(80, -135, 135, 8.5);  // 80 FEET ROAD (Major Eastern Boulevard)

    // 2. Secondary Cross Streets (Vertical)
    createVerticalRoad(-130, -135, 135, 6); // Outer West Perimeter Road
    createVerticalRoad(-40, -135, 135, 5.5); // 2nd Cross Road
    createVerticalRoad(0, -135, 135, 6);    // 4th Cross Road (Central Axis)
    createVerticalRoad(40, -135, 135, 5.5);  // 6th Cross Road
    createVerticalRoad(130, -135, 135, 6);  // Outer East Perimeter Road

    // 3. Primary Arterial Roads (Horizontal)
    createHorizontalRoad(-130, -135, 135, 8); // CMH ROAD (Chinmaya Mission Hospital Road)
    createHorizontalRoad(130, -135, 135, 8);  // 12TH MAIN ROAD (South Arterial)

    // 4. Main Connecting Roads (Horizontal)
    createHorizontalRoad(-80, -135, 135, 6.5); // 2ND MAIN ROAD (North of Defence Colony Park)
    createHorizontalRoad(-35, -135, 135, 6);   // 5TH MAIN ROAD
    createHorizontalRoad(15, -135, 135, 6.5);  // 6TH MAIN ROAD (Central Commercial Cross)
    createHorizontalRoad(75, -135, 135, 6);    // 9TH MAIN ROAD

    // --- Plots of Land & Green Outlines (Cadastral Urban Blocks) ---
    const plotBorderMat = new THREE.LineBasicMaterial({ color: 0x00ff66, linewidth: 2 });
    const parkBorderMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2.2 });

    const sharedDarkMat = new THREE.MeshStandardMaterial({
      color: 0x060914,
      roughness: 0.85,
      metalness: 0.2
    });

    const sharedWireframeGreenMat = new THREE.LineBasicMaterial({
      color: 0x00ff66,
      linewidth: 1.5
    });

    const neonAccentMats = {
      cyan: new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
      yellow: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
      magenta: new THREE.MeshBasicMaterial({ color: 0xec4899 }),
      green: new THREE.MeshBasicMaterial({ color: 0x10b981 }),
    };

    const addWireframeEdges = (mesh: THREE.Mesh, parentGroup: THREE.Group, colorHex: number = 0x00ff66) => {
      const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
      const line = new THREE.LineSegments(
        edges, 
        colorHex === 0x00ff66 ? sharedWireframeGreenMat : new THREE.LineBasicMaterial({ color: colorHex })
      );
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      line.scale.copy(mesh.scale);
      parentGroup.add(line);
    };

    // Build the Plots and populate them with Trees / Wireframe Buildings
    cityPlots.current.forEach((plot) => {
      const width = plot.maxX - plot.minX;
      const depth = plot.maxZ - plot.minZ;
      const cx = (plot.minX + plot.maxX) / 2;
      const cz = (plot.minZ + plot.maxZ) / 2;

      // 1. Plot Base Pad (Dark Ground Surface)
      const padGeo = new THREE.PlaneGeometry(width - 0.4, depth - 0.4);
      const padMat = new THREE.MeshStandardMaterial({
        color: plot.type === 'park' ? 0x031810 : 0x070b16,
        roughness: 0.7,
        metalness: 0.3
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.position.set(cx, 0.025, cz);
      padMesh.receiveShadow = true;
      scene.add(padMesh);

      // 2. Glowing Neon Boundary Outline (Clean cadastral perimeter)
      const borderPoints = [
        new THREE.Vector3(plot.minX + 0.2, 0.05, plot.minZ + 0.2),
        new THREE.Vector3(plot.maxX - 0.2, 0.05, plot.minZ + 0.2),
        new THREE.Vector3(plot.maxX - 0.2, 0.05, plot.maxZ - 0.2),
        new THREE.Vector3(plot.minX + 0.2, 0.05, plot.maxZ - 0.2),
        new THREE.Vector3(plot.minX + 0.2, 0.05, plot.minZ + 0.2),
      ];
      const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
      const borderLine = new THREE.Line(borderGeo, plot.type === 'park' ? parkBorderMat : plotBorderMat);
      scene.add(borderLine);

      // 3. Fill the Plot based on its type
      if (plot.type === 'park') {
        // --- Urban Park Plot filled with small wireframe trees (Picture 1 style) ---
        const parkGroup = new THREE.Group();
        parkGroup.position.set(cx, 0, cz);

        const treeCount = Math.floor(Math.min(32, Math.max(16, (width * depth) / 95)));
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x09140f, roughness: 0.8 });
        const crownFillMat = new THREE.MeshStandardMaterial({
          color: 0x064e3b,
          emissive: 0x047857,
          emissiveIntensity: 0.35,
          roughness: 0.3,
          transparent: true,
          opacity: 0.45,
          flatShading: true
        });

        for (let t = 0; t < treeCount; t++) {
          const tx = (Math.random() - 0.5) * (width - 8);
          const tz = (Math.random() - 0.5) * (depth - 8);
          const scale = 0.8 + Math.random() * 0.45;

          const tree = new THREE.Group();
          tree.position.set(tx, 0, tz);

          // Slender trunk
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 2.2 * scale, 6), trunkMat);
          trunk.position.y = 1.1 * scale;
          tree.add(trunk);

          // Faceted wireframe crown
          const crownGeo = new THREE.IcosahedronGeometry(1.3 * scale, 0);
          const crown = new THREE.Mesh(crownGeo, crownFillMat);
          crown.position.y = 2.8 * scale;
          tree.add(crown);
          addWireframeEdges(crown, tree, 0x00ff66);

          parkGroup.add(tree);
        }
        scene.add(parkGroup);

      } else if (plot.type === 'cantilever') {
        // --- Cantilever Skyscraper (Picture 1 Left Side Style) ---
        const bGroup = new THREE.Group();
        bGroup.position.set(cx, 0, cz);

        const towerH = 48 + Math.random() * 12;
        const mainW = Math.min(width * 0.5, 14);
        const mainD = Math.min(depth * 0.5, 14);

        const shaft = new THREE.Mesh(new THREE.BoxGeometry(mainW, towerH, mainD), sharedDarkMat);
        shaft.position.y = towerH / 2;
        shaft.castShadow = true;
        bGroup.add(shaft);
        addWireframeEdges(shaft, bGroup);

        // Cantilevered overhang volume
        const cantW = mainW * 1.5;
        const cantH = 8;
        const cantD = mainD * 0.9;
        const cantMesh = new THREE.Mesh(new THREE.BoxGeometry(cantW, cantH, cantD), sharedDarkMat);
        cantMesh.position.set(mainW * 0.35, towerH * 0.65, 0);
        bGroup.add(cantMesh);
        addWireframeEdges(cantMesh, bGroup);

        // Rooftop antenna mast with blinking beacon
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 10, 6), sharedDarkMat);
        antenna.position.set(0, towerH + 5, 0);
        bGroup.add(antenna);
        addWireframeEdges(antenna, bGroup);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.set(0, towerH + 10, 0);
        bGroup.add(beacon);
        animatedPropsRef.current.blinkingLights.push(beacon);

        // Glowing colored window slits
        const slitMat = Math.random() > 0.5 ? neonAccentMats.cyan : neonAccentMats.yellow;
        for (let f = 1; f <= 5; f++) {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(mainW * 0.6, 0.4, 0.1), slitMat);
          slit.position.set(0, f * 7, mainD / 2 + 0.05);
          bGroup.add(slit);
        }

        scene.add(bGroup);

      } else if (plot.type === 'stepped') {
        // --- Multi-tier Stepped Setback Tower (Picture 1 Center Style) ---
        const bGroup = new THREE.Group();
        bGroup.position.set(cx, 0, cz);

        const baseW = Math.min(width * 0.65, 18);
        const baseD = Math.min(depth * 0.65, 18);

        const t1H = 20;
        const t1Mesh = new THREE.Mesh(new THREE.BoxGeometry(baseW, t1H, baseD), sharedDarkMat);
        t1Mesh.position.y = t1H / 2;
        bGroup.add(t1Mesh);
        addWireframeEdges(t1Mesh, bGroup);

        const t2H = 18;
        const t2W = baseW * 0.72;
        const t2D = baseD * 0.72;
        const t2Mesh = new THREE.Mesh(new THREE.BoxGeometry(t2W, t2H, t2D), sharedDarkMat);
        t2Mesh.position.y = t1H + t2H / 2;
        bGroup.add(t2Mesh);
        addWireframeEdges(t2Mesh, bGroup);

        const t3H = 16;
        const t3W = t2W * 0.65;
        const t3D = t2D * 0.65;
        const t3Mesh = new THREE.Mesh(new THREE.BoxGeometry(t3W, t3H, t3D), sharedDarkMat);
        t3Mesh.position.y = t1H + t2H + t3H / 2;
        bGroup.add(t3Mesh);
        addWireframeEdges(t3Mesh, bGroup);

        const topY = t1H + t2H + t3H;
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 12, 6), sharedDarkMat);
        mast.position.y = topY + 6;
        bGroup.add(mast);
        addWireframeEdges(mast, bGroup);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
        beacon.position.y = topY + 12;
        bGroup.add(beacon);
        animatedPropsRef.current.blinkingLights.push(beacon);

        // Window matrix dots
        for (let row = 0; row < 4; row++) {
          for (let col = -2; col <= 2; col++) {
            if (Math.random() > 0.4) {
              const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.05), neonAccentMats.green);
              win.position.set(col * 2.2, 4 + row * 3.8, baseD / 2 + 0.05);
              bGroup.add(win);
            }
          }
        }

        scene.add(bGroup);

      } else if (plot.type === 'wedge') {
        // --- Slanted Chamfered Wedge Skyscraper (Picture 1 Style) ---
        const bGroup = new THREE.Group();
        bGroup.position.set(cx, 0, cz);

        const w = Math.min(width * 0.55, 16);
        const d = Math.min(depth * 0.55, 16);
        const h = 42 + Math.random() * 8;

        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sharedDarkMat);
        bodyMesh.position.y = h / 2;
        bGroup.add(bodyMesh);
        addWireframeEdges(bodyMesh, bGroup);

        const roofGeo = new THREE.ConeGeometry(w * 0.7, 10, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofMesh = new THREE.Mesh(roofGeo, sharedDarkMat);
        roofMesh.position.y = h + 5;
        bGroup.add(roofMesh);
        addWireframeEdges(roofMesh, bGroup);

        const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), neonAccentMats.cyan);
        band.position.y = h * 0.75;
        bGroup.add(band);

        scene.add(bGroup);

      } else if (plot.type === 'spire') {
        // --- Spire Megatower with Twin Flanking Columns ---
        const bGroup = new THREE.Group();
        bGroup.position.set(cx, 0, cz);

        const centerH = 64;
        const mainW = 10;
        const mainD = 10;

        const centerMesh = new THREE.Mesh(new THREE.BoxGeometry(mainW, centerH, mainD), sharedDarkMat);
        centerMesh.position.y = centerH / 2;
        bGroup.add(centerMesh);
        addWireframeEdges(centerMesh, bGroup);

        [-8, 8].forEach(fx => {
          const flankH = 36;
          const flank = new THREE.Mesh(new THREE.BoxGeometry(4.5, flankH, mainD * 0.8), sharedDarkMat);
          flank.position.set(fx, flankH / 2, 0);
          bGroup.add(flank);
          addWireframeEdges(flank, bGroup);
        });

        const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.6, 22, 8), sharedDarkMat);
        needle.position.y = centerH + 11;
        bGroup.add(needle);
        addWireframeEdges(needle, bGroup);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.y = centerH + 22;
        bGroup.add(beacon);
        animatedPropsRef.current.blinkingLights.push(beacon);

        scene.add(bGroup);

      } else if (plot.type === 'commercial' || plot.type === 'lowrise') {
        // --- Commercial Mid-Rise with Matrix Windows ---
        const bGroup = new THREE.Group();
        bGroup.position.set(cx, 0, cz);

        const b1W = Math.min(width * 0.5, 14);
        const b1D = Math.min(depth * 0.5, 14);
        const b1H = 22 + Math.random() * 8;

        const b1 = new THREE.Mesh(new THREE.BoxGeometry(b1W, b1H, b1D), sharedDarkMat);
        b1.position.set(-b1W * 0.2, b1H / 2, -b1D * 0.2);
        bGroup.add(b1);
        addWireframeEdges(b1, bGroup);

        const b2W = b1W * 0.85;
        const b2D = b1D * 0.85;
        const b2H = b1H * 0.7;
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(b2W, b2H, b2D), sharedDarkMat);
        b2.position.set(b2W * 0.45, b2H / 2, b2D * 0.45);
        bGroup.add(b2);
        addWireframeEdges(b2, bGroup);

        for (let floor = 0; floor < 5; floor++) {
          for (let col = -2; col <= 2; col++) {
            if (Math.random() > 0.35) {
              const colors = [neonAccentMats.yellow, neonAccentMats.cyan, neonAccentMats.green, neonAccentMats.magenta];
              const cMat = colors[Math.floor(Math.random() * colors.length)];
              const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), cMat);
              win.position.set(-b1W * 0.2 + col * 1.8, 3 + floor * 3.5, -b1D * 0.2 + b1D / 2 + 0.04);
              bGroup.add(win);
            }
          }
        }

        scene.add(bGroup);
      }
    });

    // --- 4 Hero Destination Buildings (Preserved Custom Aesthetics) ---
    DESTINATIONS.forEach(dest => {
      const group = new THREE.Group();

      if (dest.id === 'home') {
        // --- 1. HOME BASE (100 Feet Road // CMH Junction) ---
        const termGeo = new THREE.BoxGeometry(20, 18, 16);
        const termMat = new THREE.MeshStandardMaterial({ color: 0x0c1324, metalness: 0.85, roughness: 0.25 });
        const terminal = new THREE.Mesh(termGeo, termMat);
        terminal.position.set(dest.position3D.x, 9, dest.position3D.z);
        terminal.castShadow = true;
        group.add(terminal);
        addWireframeEdges(terminal, group, 0x00f0ff);

        // Glass Curtain Wall facing 100 Feet Road (West)
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.4,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.85
        });
        const glassWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 12, 14), glassMat);
        glassWall.position.set(dest.position3D.x - 10.2, 8, dest.position3D.z);
        group.add(glassWall);

        // Cantilevered Canopy extending towards 100 Feet Road
        const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 16), canopyMat);
        canopy.position.set(dest.position3D.x - 12, 8.5, dest.position3D.z);
        group.add(canopy);
        addWireframeEdges(canopy, group, 0x00f0ff);

        // Dual Supercharger Pylons
        [-5, 5].forEach(pz => {
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4, 0.9), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
          pylon.position.set(dest.position3D.x - 15, 2, dest.position3D.z + pz);
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 3.2, 0.2), neonAccentMats.cyan);
          pylon.add(bar);
          group.add(pylon);
        });

        // 3D Illuminated Signboard facing 100 Feet Road
        const homeSign = createBillboardMesh(16, 4.2, 'HOME BASE', '100 FT RD // FLEET DEPOT', '#00f0ff');
        homeSign.position.set(dest.position3D.x - 10.4, 16.5, dest.position3D.z);
        homeSign.rotation.y = -Math.PI / 2;
        group.add(homeSign);

      } else if (dest.id === 'publications') {
        // --- 2. PUBLICATIONS HUB (80 Feet Road Campus) ---
        const labTowerMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.7, roughness: 0.3 });
        
        const tower1 = new THREE.Mesh(new THREE.BoxGeometry(12, 28, 12), labTowerMat);
        tower1.position.set(dest.position3D.x, 14, dest.position3D.z - 8);
        tower1.castShadow = true;
        group.add(tower1);
        addWireframeEdges(tower1, group, 0x10b981);

        const tower2 = new THREE.Mesh(new THREE.BoxGeometry(12, 24, 12), labTowerMat);
        tower2.position.set(dest.position3D.x, 12, dest.position3D.z + 8);
        tower2.castShadow = true;
        group.add(tower2);
        addWireframeEdges(tower2, group, 0x10b981);

        // Skybridge connecting the towers
        const skybridge = new THREE.Mesh(
          new THREE.BoxGeometry(8, 5, 16),
          new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.45, transparent: true, opacity: 0.85 })
        );
        skybridge.position.set(dest.position3D.x, 18, dest.position3D.z);
        group.add(skybridge);
        addWireframeEdges(skybridge, group, 0x10b981);

        // Quantum Data Core with glowing revolving rings
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const core = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 20, 24), coreMat);
        core.position.set(dest.position3D.x, 11, dest.position3D.z);
        group.add(core);

        const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
        for (let r = 0; r < 3; r++) {
          const cRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.15, 8, 32), ringMat);
          cRing.rotation.x = Math.PI / 2;
          cRing.position.set(dest.position3D.x, 6 + r * 5, dest.position3D.z);
          group.add(cRing);
        }

        // Rotating rooftop radar dish
        const radarGroup = new THREE.Group();
        radarGroup.position.set(dest.position3D.x, 29, dest.position3D.z - 8);
        const dish = new THREE.Mesh(
          new THREE.CylinderGeometry(2.5, 0.3, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
        );
        dish.rotation.z = Math.PI / 3;
        radarGroup.add(dish);
        group.add(radarGroup);
        animatedPropsRef.current.radarDishes.push(radarGroup);

        // 3D Neon Sign facing 80 Feet Road (West)
        const pubSign = createBillboardMesh(16, 4.2, 'PUBLICATIONS', '80 FT RD // CV RESEARCH', '#10b981');
        pubSign.position.set(dest.position3D.x - 7.5, 18, dest.position3D.z);
        pubSign.rotation.y = -Math.PI / 2;
        group.add(pubSign);

      } else if (dest.id === 'blog') {
        // --- 3. BLOG TOWER (100 Feet Road // 12th Main) ---
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, metalness: 0.8, roughness: 0.25 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), towerMat);
        base.position.set(dest.position3D.x, 9, dest.position3D.z);
        base.castShadow = true;
        group.add(base);
        addWireframeEdges(base, group, 0xf59e0b);

        const mid = new THREE.Mesh(new THREE.BoxGeometry(14, 18, 14), towerMat);
        mid.position.set(dest.position3D.x, 27, dest.position3D.z);
        mid.castShadow = true;
        group.add(mid);
        addWireframeEdges(mid, group, 0xf59e0b);

        const top = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 10), towerMat);
        top.position.set(dest.position3D.x, 44, dest.position3D.z);
        top.castShadow = true;
        group.add(top);
        addWireframeEdges(top, group, 0xf59e0b);

        // Helipad atop roof
        const helipad = new THREE.Mesh(
          new THREE.CylinderGeometry(4.8, 4.8, 0.4, 24),
          new THREE.MeshStandardMaterial({ color: 0x292524 })
        );
        helipad.position.set(dest.position3D.x, 52.2, dest.position3D.z);
        group.add(helipad);

        const heliRing = new THREE.Mesh(new THREE.RingGeometry(4.3, 4.6, 24), neonAccentMats.yellow);
        heliRing.rotation.x = -Math.PI / 2;
        heliRing.position.set(dest.position3D.x, 52.45, dest.position3D.z);
        group.add(heliRing);

        // Needle mast with aviation beacon
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.45, 16, 8), sharedDarkMat);
        mast.position.set(dest.position3D.x, 60, dest.position3D.z);
        group.add(mast);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        beacon.position.set(dest.position3D.x, 68, dest.position3D.z);
        group.add(beacon);
        animatedPropsRef.current.blinkingLights.push(beacon);

        // 3D Neon Sign facing 100 Feet Road (West)
        const blogSign = createBillboardMesh(16, 4.2, 'BLOG TOWER', '100 FT RD // TECH PERSPECTIVES', '#f59e0b');
        blogSign.position.set(dest.position3D.x - 9.5, 20, dest.position3D.z);
        blogSign.rotation.y = -Math.PI / 2;
        group.add(blogSign);

      } else {
        // --- 4. ABOUT PLAZA (100 Feet Road // Defence Colony Pavilion) ---
        const dais = new THREE.Mesh(
          new THREE.CylinderGeometry(14, 15, 1.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x2e1065, metalness: 0.8, roughness: 0.3 })
        );
        dais.position.set(dest.position3D.x, 0.7, dest.position3D.z);
        dais.receiveShadow = true;
        group.add(dais);
        addWireframeEdges(dais, group, 0x8b5cf6);

        // 4 Illuminated Cyber-Pillars
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
        [
          { x: dest.position3D.x - 6, z: dest.position3D.z - 6 },
          { x: dest.position3D.x + 6, z: dest.position3D.z - 6 },
          { x: dest.position3D.x - 6, z: dest.position3D.z + 6 },
          { x: dest.position3D.x + 6, z: dest.position3D.z + 6 },
        ].forEach(pp => {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 2), pillarMat);
          pillar.position.set(pp.x, 7.5, pp.z);
          pillar.castShadow = true;
          const neonSlot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 14.5, 2.05), new THREE.MeshBasicMaterial({ color: 0x8b5cf6 }));
          pillar.add(neonSlot);
          group.add(pillar);
          addWireframeEdges(pillar, group, 0x8b5cf6);
        });

        // Translucent Faceted Crystal Canopy
        const canopy = new THREE.Mesh(
          new THREE.CylinderGeometry(13, 15, 1.6, 8),
          new THREE.MeshStandardMaterial({
            color: 0x7c3aed,
            emissive: 0x6d28d9,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.8
          })
        );
        canopy.position.set(dest.position3D.x, 15.5, dest.position3D.z);
        group.add(canopy);
        addWireframeEdges(canopy, group, 0x8b5cf6);

        // Floating, Rotating Hologram Core
        const holoOrb = new THREE.Mesh(
          new THREE.IcosahedronGeometry(2.5, 1),
          new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            emissive: 0xc084fc,
            emissiveIntensity: 0.85,
            wireframe: true
          })
        );
        holoOrb.position.set(dest.position3D.x, 8, dest.position3D.z);
        group.add(holoOrb);
        animatedPropsRef.current.holoOrb = holoOrb;

        // 3D Neon Sign facing 100 Feet Road (East)
        const aboutSign = createBillboardMesh(16, 4.2, 'ABOUT PLAZA', '100 FT RD // AI & ROBOTICS', '#8b5cf6');
        aboutSign.position.set(dest.position3D.x + 10.5, 16, dest.position3D.z);
        aboutSign.rotation.y = Math.PI / 2;
        group.add(aboutSign);
      }

      // Parking / Docking Stop Box on the road (Clean rectangular stopping bay)
      const stopLineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
      const stopBox = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), stopLineMat);
      stopBox.rotation.x = -Math.PI / 2;
      stopBox.position.set(dest.stopPosition.x, 0.026, dest.stopPosition.z);
      group.add(stopBox);

      scene.add(group);
    });

    // --- Cyber Vehicle Model ---
    const car = new THREE.Group();

    // Chassis Underglow
    const underglow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 5.8),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 })
    );
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.04;
    car.add(underglow);

    // Main Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0e172a, metalness: 0.9, roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 4.6), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);

    // Windshield / Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.85, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x050912, metalness: 0.95, roughness: 0.1 })
    );
    cabin.position.set(0, 1.3, -0.4);
    cabin.castShadow = true;
    car.add(cabin);

    // 4 Wheels with Cyan Cyber Rims
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.2 });
    [
      { x: -1.2, z: 1.45 },
      { x: 1.2, z: 1.45 },
      { x: -1.2, z: -1.45 },
      { x: 1.2, z: -1.45 },
    ].forEach(wPos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wPos.x, 0.44, wPos.z);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.37, 12), rimMat);
      wheel.add(rim);
      car.add(wheel);
    });

    // Spinning Roof LiDAR Sensor Puck
    const lidarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    lidarBase.position.set(0, 1.82, -0.4);
    car.add(lidarBase);

    const lidarPuck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x090e1a, metalness: 0.9 })
    );
    lidarPuck.position.set(0, 2.05, -0.4);
    const diode = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    diode.position.set(0, 0, 0.32);
    lidarPuck.add(diode);
    car.add(lidarPuck);
    animatedPropsRef.current.lidarPuck = lidarPuck;

    // Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), lightMat);
    hl1.position.set(0.72, 0.58, 2.31);
    car.add(hl1);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), lightMat);
    hl2.position.set(-0.72, 0.58, 2.31);
    car.add(hl2);

    // Light Cones
    const beamGeo = new THREE.ConeGeometry(1.5, 12, 16);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, depthWrite: false });
    const beam1 = new THREE.Mesh(beamGeo, beamMat);
    beam1.rotation.x = -Math.PI / 2 + 0.08;
    beam1.position.set(0.72, 0.5, 8.2);
    car.add(beam1);
    const beam2 = new THREE.Mesh(beamGeo, beamMat);
    beam2.rotation.x = -Math.PI / 2 + 0.08;
    beam2.position.set(-0.72, 0.5, 8.2);
    car.add(beam2);

    // Red Taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.1), tailMat);
    tl1.position.set(0.72, 0.62, -2.31);
    car.add(tl1);
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.1), tailMat);
    tl2.position.set(-0.72, 0.62, -2.31);
    car.add(tl2);

    // Start parked at Home Base (100 Feet Road: x=-80, z=-105, facing South)
    car.position.set(-80, 0.1, -105);
    car.rotation.y = Math.PI;
    carRef.current = car;
    scene.add(car);

    // --- Render Loop ---
    let frame = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame++;

      if (!isNavigatingRef.current && carRef.current) {
        carRef.current.position.y = 0.1 + Math.sin(frame * 0.03) * 0.025;
      } else if (carRef.current) {
        carRef.current.position.y = 0.1;
      }

      // Animated Props
      if (animatedPropsRef.current.lidarPuck) {
        animatedPropsRef.current.lidarPuck.rotation.y += 0.08;
      }
      animatedPropsRef.current.radarDishes.forEach(dish => {
        dish.rotation.y += 0.02;
      });
      if (animatedPropsRef.current.holoOrb) {
        animatedPropsRef.current.holoOrb.rotation.y += 0.015;
        animatedPropsRef.current.holoOrb.rotation.z += 0.008;
        animatedPropsRef.current.holoOrb.position.y = 8 + Math.sin(frame * 0.04) * 0.4;
      }
      animatedPropsRef.current.blinkingLights.forEach(b => {
        const mat = b.material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = Math.sin(frame * 0.08) > 0.1 ? 1 : 0.15;
      });

      // Smooth Camera Animation & Lerping
      if (isResettingCameraRef.current && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.06);
        controlsRef.current.target.lerp(targetLookAtRef.current, 0.06);
        cameraRef.current.lookAt(controlsRef.current.target);

        if (cameraRef.current.position.distanceTo(targetCamPosRef.current) < 0.5) {
          cameraRef.current.position.copy(targetCamPosRef.current);
          controlsRef.current.target.copy(targetLookAtRef.current);
          controlsRef.current.update();
          isResettingCameraRef.current = false;
        }
      } else if (controlsRef.current && controlsRef.current.enabled) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync controls with navigation state
  useEffect(() => {
    if (!controlsRef.current) return;
    if (isNavigating) {
      controlsRef.current.enabled = false;
      isResettingCameraRef.current = false;
    } else {
      controlsRef.current.enabled = true;
    }
  }, [isNavigating]);

  // Camera View Mode Switching
  const setCameraTopDown = () => {
    if (isNavigating) return;
    setViewMode('topDown');
    targetCamPosRef.current.set(0, 260, 0);
    targetLookAtRef.current.set(0, 0, 0);
    isResettingCameraRef.current = true;
  };

  const setCameraFocusCar = () => {
    if (isNavigating || !carRef.current) return;
    setViewMode('follow');
    const carPos = carRef.current.position;
    const heading = carRef.current.rotation.y;
    targetCamPosRef.current.set(
      carPos.x - Math.sin(heading) * 26,
      carPos.y + 14,
      carPos.z - Math.cos(heading) * 26
    );
    targetLookAtRef.current.set(carPos.x, 2, carPos.z);
    isResettingCameraRef.current = true;
  };

  const handleResetView = () => {
    if (isNavigating) return;
    if (viewMode === 'topDown') {
      setCameraFocusCar();
    } else {
      setCameraTopDown();
    }
  };

  // --- Navigation Trigger ---
  const navigateTo = (destination: DestinationItem) => {
    if (isNavigating) return;
    if (currentPosition.id === destination.id) {
      setSelectedDestination(destination);
      return;
    }

    const routePath = computeCityRoute(currentPosition.id, destination.id);
    if (!routePath || routePath.length < 2) return;

    setCurrentRoute({ path: routePath, destination });
    setIsNavigating(true);
    setViewMode('follow');
    setCurrentPosition(destination);
  };

  // --- Navigation Movement & Camera Follow Loop ---
  useEffect(() => {
    if (!isNavigating || currentRoute.path.length === 0) return;

    const SPEED = 0.65;
    const ROTATION_SPEED = 0.12;
    let currentSegmentIndex = 0;
    let animId: number;

    const animateMovement = () => {
      if (!carRef.current) return;
      const path = currentRoute.path;

      if (currentSegmentIndex >= path.length - 1) {
        // Reached Destination
        setIsNavigating(false);
        setNavigationProgress(1);
        setViewMode('hero');
        setTimeout(() => setSelectedDestination(currentRoute.destination), 500);
        return;
      }

      const isFinalSegment = currentSegmentIndex === path.length - 2;
      const target = path[currentSegmentIndex + 1];
      const current = carRef.current.position;

      // 1. Calculate direction to target waypoint
      const dx = target.x - current.x;
      const dz = target.z - current.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // 2. Target heading angle
      const targetRotation = Math.atan2(dx, dz);

      // 3. Smoothly rotate car towards target
      let rotDiff = targetRotation - carRef.current.rotation.y;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      carRef.current.rotation.y += rotDiff * ROTATION_SPEED;

      // 4. Move car forward
      if (Math.abs(rotDiff) < 0.85) {
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

        if (isFinalSegment && dist < 0.3) {
          carRef.current.position.x = target.x;
          carRef.current.position.z = target.z;
          if (target.heading !== undefined) {
            carRef.current.rotation.y = target.heading;
          }
          currentSegmentIndex++;
          setIsNavigating(false);
          setNavigationProgress(1);
          setViewMode('hero');
          setTimeout(() => setSelectedDestination(currentRoute.destination), 500);
          return;
        } else if (!isFinalSegment && dist < 1.2) {
          currentSegmentIndex++;
        }
      }

      // 5. Camera Follow Car (Third-person chase camera closely tracking the car)
      if (cameraRef.current && carRef.current) {
        const carX = carRef.current.position.x;
        const carY = carRef.current.position.y;
        const carZ = carRef.current.position.z;
        const heading = carRef.current.rotation.y;

        const followDist = 26;
        const followHeight = 14;
        const targetCamX = carX - Math.sin(heading) * followDist;
        const targetCamZ = carZ - Math.cos(heading) * followDist;
        const targetCamY = carY + followHeight;

        cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.08;
        cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.08;
        cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.08;

        const targetLookX = carX + Math.sin(heading) * 8;
        const targetLookZ = carZ + Math.cos(heading) * 8;
        if (controlsRef.current) {
          controlsRef.current.target.x += (targetLookX - controlsRef.current.target.x) * 0.1;
          controlsRef.current.target.y += (carY + 2 - controlsRef.current.target.y) * 0.1;
          controlsRef.current.target.z += (targetLookZ - controlsRef.current.target.z) * 0.1;
          cameraRef.current.lookAt(controlsRef.current.target);
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
    const content: Record<string, { title: string; body: React.ReactNode }> = {
      home: { 
        title: 'Mission Control', 
        body: (
          <div className="space-y-6">
            <p className="text-gray-300 text-lg leading-relaxed">
              Think of this as a virtual city tour, except the car is on digital training wheels and blindly following a hardcoded path.(procedural city generation and actual pathfinding coming in v2).
            </p>
            <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Navigation2 className="w-5 h-5 text-cyan-400" />
                How to hitch a ride
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">1</span>
                  <span>Pick a stop from the <strong>Control Center</strong> on your left.</span>
    </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">2</span>
                  <span>Ride shotgun while the car cruises through the city streets.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">3</span>
                  <span>Hop out at your destination to check out my resume, blog posts, or my lone research paper.</span>
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
              <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium">
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
          <p className="text-gray-300 leading-relaxed">
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
            If you're interested in collaborating on CV, robotics, or anything that involves turning data into decisions, feel free to reach out 
            at kalyanikulkarni2002@gmail.com.
            <br /><br />
            <a 
              href="https://drive.google.com/file/d/1ObAfUlCZxJTFjtayz1PFJjWL0vS4abp_/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300 font-semibold"
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
      <div className="w-full max-w-7xl h-[860px] bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="grid grid-cols-5 h-full">
          
          {/* --- Sidebar (Control Center) --- */}
          <div className="col-span-2 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full backdrop-blur">
            {/* Header */}
            <div className="p-6 border-b border-slate-800/80 bg-slate-950/80">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white text-xl font-bold flex items-center gap-2">
                  <Navigation2 className="w-5 h-5 text-cyan-400" />
                  Control Center
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold tracking-wider">
                  V2X MATRIX // INDIRANAGAR
                </span>
              </div>
              <p className="text-gray-400 text-xs font-mono tracking-wide">AUTONOMOUS CADASTRAL URBAN MATRIX</p>
            </div>
            
            {/* Destination List */}
            <div className="p-4 space-y-3 bg-slate-900/60 flex-1 overflow-y-auto">
              {DESTINATIONS.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => navigateTo(dest)}
                  disabled={isNavigating}
                  className={`w-full px-4 py-4 text-left rounded-xl transition-all border flex items-center gap-4 group
                    ${currentPosition.id === dest.id 
                      ? 'bg-slate-800/90 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.18)]' 
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'}
                    ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className={`p-2.5 rounded-lg transition-transform group-hover:scale-105 ${currentPosition.id === dest.id ? 'bg-cyan-500/20' : 'bg-slate-800/80 group-hover:bg-slate-700'}`}>
                    <dest.icon className="w-5 h-5" style={{ color: dest.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-200 group-hover:text-white transition-colors">{dest.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{dest.sector}</div>
                  </div>
                  {currentPosition.id === dest.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Quick Stats / Info Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>ARTERIALS: 100 FT & 80 FT RD</span>
              <span>DEFENCE COLONY PARK</span>
            </div>
          </div>
          
          {/* --- 3D Viewport --- */}
          <div className="col-span-3 bg-[#050811] relative w-full h-full overflow-hidden select-none">
            <canvas 
              ref={canvasRef} 
              onContextMenu={(e) => e.preventDefault()}
              className={`w-full h-full block ${isNavigating ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`} 
            />
            
            {/* Overlay UI: Status & Camera Mode Switcher */}
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-200 text-xs font-mono shadow-xl flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]' : 'bg-emerald-400'}`}></span>
                  <span>SYS: {isNavigating ? 'AUTONOMOUS TRANSIT' : 'DOCKED // IDLE'}</span>
                </div>

                {/* Top-Down Map View Button */}
                <button
                  onClick={setCameraTopDown}
                  disabled={isNavigating}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono shadow-xl flex items-center gap-1.5 transition-all
                    ${viewMode === 'topDown' 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="Switch to Top-Down City Map Overview"
                >
                  <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TOP-DOWN MAP</span>
                </button>

                {/* Focus Car Button */}
                <button
                  onClick={setCameraFocusCar}
                  disabled={isNavigating}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono shadow-xl flex items-center gap-1.5 transition-all
                    ${viewMode === 'follow' 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="Focus camera closely on the autonomous car"
                >
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  <span>FOCUS CAR</span>
                </button>

                <button
                  onClick={handleResetView}
                  disabled={isNavigating}
                  className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-white text-xs font-mono shadow-xl flex items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Toggle view mode"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>

              <div className="text-[11px] text-slate-400/90 font-mono bg-slate-900/70 backdrop-blur px-2.5 py-1 rounded border border-slate-800/80 w-fit pointer-events-none flex items-center gap-1.5 shadow">
                <span>🖱️ Click & drag to rotate • Scroll to zoom</span>
              </div>
            </div>

            {/* Minimap Overlay (Top-Right) */}
            <div className="absolute top-6 right-6 w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-[#050811]">
              <VectorMap
                currentPosition={currentPosition}
                destinations={DESTINATIONS}
                isNavigating={isNavigating}
                navigationProgress={navigationProgress}
                currentRoute={currentRoute}
                plots={cityPlots.current}
              />
            </div>

            {/* Bottom Status Pill */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-700/80 flex items-center gap-3 shadow-2xl pointer-events-none">
              <div className={`w-2 h-2 rounded-full ${isNavigating ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]' : 'bg-emerald-400'}`}></div>
              <span className="text-slate-200 text-xs font-mono tracking-wider">
                {isNavigating ? "AUTONOMOUS PATHFINDING // ACTIVE" : `DOCKED AT ${currentPosition.name.toUpperCase()}`}
              </span>
            </div>
          </div>

        </div>
      </div>
      
      {/* Pop-up Modal for Destination / Blog Posts */}
      {selectedDestination && !isNavigating && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div className="bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[85vh] border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-start p-8 pb-6 border-b border-slate-800">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <selectedDestination.icon className="w-8 h-8" style={{ color: selectedDestination.color }} />
                {selectedDestination.id === 'blog' ? 'Blog Tower' : renderContent()?.title}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-8 flex-1">
              {selectedDestination.id === 'blog' ? (
                selectedBlogPost ? (
                  <div>
                    <button onClick={() => setSelectedBlogPost(null)} className="mb-6 text-cyan-400 hover:text-cyan-300 flex items-center gap-2 font-medium">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to all posts
                    </button>
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedBlogPost.title}</h3>
                    <p className="text-gray-400 text-sm mb-6 font-mono">{selectedBlogPost.date}</p>
                    {selectedBlogPost.content}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blogPosts.map(post => (
                      <div key={post.id} onClick={() => setSelectedBlogPost(post)}
                        className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-white group-hover:text-cyan-400">{post.title}</h3>
                          <svg className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-sm mb-3 font-mono">{post.date}</p>
                        <p className="text-gray-300">{post.preview}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="prose prose-invert max-w-none">
                  {renderContent()?.body}
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