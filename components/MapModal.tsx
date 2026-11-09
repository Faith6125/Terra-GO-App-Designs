import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trip, Student, StudentStatus, GpsStatus } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  Check, 
  X
} from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lon: number } | null;
  trip: Trip | null;
  gpsStatus: GpsStatus;
  isDarkMode?: boolean;
  onGpsStatusChange: (status: GpsStatus) => void;
  onUpdateStudentStatus?: (studentId: string, status: StudentStatus) => void;
}

// Preset scenic Nairobi route coordinates across safe neighbourhoods
const NAIROBI_STOPS = [
  { name: "Westlands Bus Depot", lat: -1.2642, lon: 36.8041 },
  { name: "Lantana Road Court", lat: -1.2685, lon: 36.7924 },
  { name: "Muthangari Ring Road", lat: -1.2721, lon: 36.7831 },
  { name: "Rhapta Road Bypass", lat: -1.2651, lon: 36.7930 },
  { name: "Lavington Close Stop", lat: -1.2789, lon: 36.7728 },
  { name: "James Gichuru Junction", lat: -1.2845, lon: 36.7625 },
  { name: "Kenyatta Avenue Loop", lat: -1.2825, lon: 36.8115 },
  { name: "Kileleshwa Heights Lane", lat: -1.2798, lon: 36.7952 },
  { name: "Kilimani Estate Stop", lat: -1.2882, lon: 36.7915 },
  { name: "Riara Road Close", lat: -1.2942, lon: 36.7865 },
  { name: "Riara Primary School", lat: -1.2985, lon: 36.7825 },
];

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  location,
  trip,
  gpsStatus,
  isDarkMode: isDarkModeProp,
  onGpsStatusChange: _onGpsStatusChange,
  onUpdateStudentStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline[]>([]);
  const busMarkerRef = useRef<L.Marker | null>(null);

  // Simulation states
  const [currentSegment, setCurrentSegment] = useState(0);
  const [segmentProgress, setSegmentProgress] = useState(0.0);
  const [speed, setSpeed] = useState(47.2);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active theme detection
  const [isDarkModeState, setIsDarkModeState] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
           document.querySelector('.phone-screen')?.classList.contains('dark') || 
           false;
  });

  const isDarkMode = typeof isDarkModeProp === 'boolean' ? isDarkModeProp : isDarkModeState;

  // Track real dark mode changes
  useEffect(() => {
    if (typeof isDarkModeProp === 'boolean') {
      return;
    }

    const observer = new MutationObserver(() => {
      const darkEnabled = document.documentElement.classList.contains('dark') || 
                          document.querySelector('.phone-screen')?.classList.contains('dark') || 
                          false;
      setIsDarkModeState(darkEnabled);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const phoneScreen = document.querySelector('.phone-screen');
    if (phoneScreen) {
      observer.observe(phoneScreen, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, [isDarkModeProp]);

  // Compute student coordinates sequence
  const studentStops = useMemo(() => {
    if (!trip || !trip.students || trip.students.length === 0) return [];
    
    return trip.students.map((student, i) => {
      // Map to preset coordinates sequentionally
      const patIndex = 1 + (i % (NAIROBI_STOPS.length - 2));
      const pat = NAIROBI_STOPS[patIndex];
      return {
        student,
        lat: pat.lat,
        lon: pat.lon,
        name: pat.name,
        stopNumber: i + 1,
      };
    });
  }, [trip]);

  // Combined physical route sequence including Depot and Terminus
  const routePoints = useMemo(() => {
    const depot = NAIROBI_STOPS[0];
    const school = NAIROBI_STOPS[NAIROBI_STOPS.length - 1];

    if (studentStops.length === 0) {
      return [
        { name: "Westlands Bus Depot", lat: depot.lat, lon: depot.lon, stopNumber: 0, student: null },
        { name: "Riara Primary School", lat: school.lat, lon: school.lon, stopNumber: 1, student: null }
      ];
    }

    return [
      { name: "Westlands Bus Depot", lat: depot.lat, lon: depot.lon, stopNumber: 0, student: null },
      ...studentStops,
      { name: "Riara Primary School", lat: school.lat, lon: school.lon, stopNumber: studentStops.length + 1, student: null }
    ];
  }, [studentStops]);

  // Current bus latitude and longitude based on simulation or real physical GPS
  const busCoords = useMemo(() => {
    if (gpsStatus === 'active' && location) {
      return [location.lat, location.lon] as [number, number];
    }

    // Fallback/Simulated progression
    if (routePoints.length === 0) return [-1.286389, 36.817223] as [number, number];

    const isCompleted = currentSegment >= routePoints.length - 1;
    if (isCompleted) {
      const finalPoint = routePoints[routePoints.length - 1];
      return [finalPoint.lat, finalPoint.lon] as [number, number];
    }

    const startPt = routePoints[currentSegment];
    const endPt = routePoints[currentSegment + 1];

    const lat = startPt.lat + segmentProgress * (endPt.lat - startPt.lat);
    const lon = startPt.lon + segmentProgress * (endPt.lon - startPt.lon);

    return [lat, lon] as [number, number];
  }, [routePoints, currentSegment, segmentProgress, location, gpsStatus]);

  // Calculated bearing (heading) of the bus to rotate the navigation caret
  const busHeading = useMemo(() => {
    if (routePoints.length === 0 || currentSegment >= routePoints.length - 1) return 0;

    const startPt = routePoints[currentSegment];
    const endPt = routePoints[currentSegment + 1];

    const dLon = (endPt.lon - startPt.lon) * Math.PI / 180;
    const lat1 = startPt.lat * Math.PI / 180;
    const lat2 = endPt.lat * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearingRad = Math.atan2(y, x);
    const bearingDeg = (bearingRad * 180 / Math.PI + 360) % 360;

    return bearingDeg;
  }, [routePoints, currentSegment]);

  // Automated Cruise simulations
  useEffect(() => {
    if (!isOpen) return;

    // Simulation ticker for driving coordinates
    const driveInterval = setInterval(() => {
      setSegmentProgress((prev) => {
        const nextProgress = prev + 0.05; // 5% progression per tick
        if (nextProgress >= 1.0) {
          setCurrentSegment((seg) => {
            if (seg >= routePoints.length - 2) {
              return seg; // Arrived at school
            }
            return seg + 1;
          });
          return 0.0;
        }
        return nextProgress;
      });
    }, 1500);

    // Speed fluctuation ticker
    const speedInterval = setInterval(() => {
      setSpeed((prev) => {
        const delta = Math.random() > 0.5 ? 1.4 : -1.4;
        const nextSpeed = Math.max(43, Math.min(52, prev + delta));
        return parseFloat(nextSpeed.toFixed(1));
      });
    }, 2000);

    return () => {
      clearInterval(driveInterval);
      clearInterval(speedInterval);
    };
  }, [isOpen, routePoints]);

  // Initializing Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [-1.286389, 36.817223],
      zoom: 15,
    });

    mapRef.current = map;

    // Set correct theme tiles
    const tileUrl = isDarkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19
    }).addTo(map);

    // Initial render call forces sizing bounds sync
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, isDarkMode]);

  // Update center to focus on Bus location smoothly
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(busCoords, 15);
    }
  }, [busCoords]);

  // Redraw Polylines and child stop markers when state updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routePoints.length === 0) return;

    // 1. Clear existing polylines
    polylineRef.current.forEach(layer => layer.remove());
    polylineRef.current = [];

    // Construct path coords array
    const pathCoords = routePoints.map(p => [p.lat, p.lon] as [number, number]);

    // Active plain foreground GPS line (Clean vibrant brand indigo with absolutely NO greyish halo or outer border)
    const activeTrail = L.polyline(pathCoords, {
      color: '#303690',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    polylineRef.current = [activeTrail];

    // 2. Clear and Redraw Student Stop Markers
    Object.keys(markersRef.current).forEach(key => {
      markersRef.current[key].remove();
    });
    markersRef.current = {};

    studentStops.forEach((stop) => {
      const student = stop.student;
      
      let ringPulse = '';
      if (currentSegment === stop.stopNumber - 1) {
        // Current active upcoming stop gets a micro-scale jump animation
        ringPulse = 'animate-bounce';
      }

      // Format initials
      const initials = student.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      // Configure explicit fallback background colors
      let fallbackBgHex = '#94a3b8'; // default slate grey
      if (student.status === StudentStatus.Boarded || student.status === StudentStatus.Alighted) {
        fallbackBgHex = '#10b981'; // green
      } else if (student.status === StudentStatus.Absent) {
        fallbackBgHex = '#ef4444'; // red
      } else if (currentSegment === stop.stopNumber - 1) {
        fallbackBgHex = '#303690'; // current active stop is brand indigo
      }

      // Render a monolithic, 100% reliable SVG pin to prevent browser z-index and relative/absolute clipping bugs
      const customHtml = `
        <div class="${ringPulse}" style="width: 44px; height: 54px; position: relative; background: transparent; border: none; padding: 0;">
          <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; width: 44px; height: 54px; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.25));">
            <defs>
              <clipPath id="avatarClip-${student.id}">
                <circle cx="22" cy="22" r="14" />
              </clipPath>
            </defs>

            <!-- Pure, clean, shadow-elevated White Teardrop Pin Body without heavy outer gray borders/strokes -->
            <path d="M22 50 C22 50 39 34.5 39 22 C39 12.6112 31.3888 5 22 5 C12.6112 5 5 12.6112 5 22 C5 34.5 22 50 22 50 Z" 
                  fill="#ffffff" />

            <!-- Circular Avatar Background representing status color -->
            <circle cx="22" cy="22" r="13.5" fill="${fallbackBgHex}" />

            <!-- Fallback initials always drawn perfectly centered in vectors -->
            <text x="22" y="22" 
                  fill="#ffffff" 
                  font-size="9" 
                  font-weight="900" 
                  font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" 
                  text-anchor="middle" 
                  dominant-baseline="central" 
                  style="text-transform: uppercase; letter-spacing: -0.02em;">${initials}</text>

            <!-- Clip-path image to fill the exact round shape of the avatar loop, completely bypassing HTML layering issues -->
            ${student.imgUrl ? `
            <g clip-path="url(#avatarClip-${student.id})">
              <image href="${student.imgUrl}" x="8" y="8" width="28" height="28" preserveAspectRatio="xMidYMid slice" />
            </g>
            ` : ''}

            <!-- Boarded status overlay with checkmark -->
            ${student.status === StudentStatus.Boarded || student.status === StudentStatus.Alighted ? `
            <circle cx="22" cy="22" r="14" fill="#10b981" opacity="0.95" />
            <path d="M16 22 L20 26 L28 17" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ` : ''}

            <!-- Absent status overlay with custom cross icon -->
            ${student.status === StudentStatus.Absent ? `
            <circle cx="22" cy="22" r="14" fill="#ef4444" opacity="0.95" />
            <path d="M17 17 L27 27 M27 17 L17 27" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ` : ''}
          </svg>

          <!-- Pin Sequence Stop Number Order Tag on the top right -->
          <div style="position: absolute !important; top: -4px !important; right: -4px !important; z-index: 200 !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 18px !important; height: 18px !important; border-radius: 50% !important; background-color: #1e293b !important; color: #ffffff !important; font-size: 9px !important; font-weight: 900 !important; font-family: system-ui, -apple-system, sans-serif !important; border: 1.5px solid #ffffff !important; box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;">
            ${stop.stopNumber}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: '!bg-transparent !border-none !shadow-none',
        iconSize: [44, 54],
        iconAnchor: [22, 54]
      });

      const marker = L.marker([stop.lat, stop.lon], { icon: customIcon }).addTo(map);
      
      // Select student on marker click and center map on that marker
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedStudentId(student.id);
        map.setView([stop.lat, stop.lon], 16);
      });

      markersRef.current[student.id] = marker;
    });

  }, [routePoints, studentStops, currentSegment, isDarkMode]);

  // Draw Bus navigation caret marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (busMarkerRef.current) {
      busMarkerRef.current.remove();
      busMarkerRef.current = null;
    }

    const busHtml = `
      <div style="transform: rotate(${busHeading}deg); transform-origin: center; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.35));" class="relative w-12 h-12 flex items-center justify-center bg-transparent border-none">
        <svg style="display: block;" class="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Black tyres protruding slightly at front left/right & rear left/right -->
          <rect x="8" y="10" width="4" height="8" rx="1" fill="#1e293b" />
          <rect x="36" y="10" width="4" height="8" rx="1" fill="#1e293b" />
          <rect x="8" y="30" width="4" height="8" rx="1" fill="#1e293b" />
          <rect x="36" y="30" width="4" height="8" rx="1" fill="#1e293b" />
          
          <!-- Side mirrors (ears at the front front) -->
          <rect x="7" y="7" width="4" height="1.5" fill="#eab308" />
          <rect x="37" y="7" width="4" height="1.5" fill="#eab308" />
          <rect x="5" y="6" width="2" height="3.5" rx="0.5" fill="#0f172a" />
          <rect x="41" y="6" width="2" height="3.5" rx="0.5" fill="#0f172a" />

          <!-- Real Top-Down School Bus Main Body -->
          <rect x="11" y="4" width="26" height="40" rx="4.5" fill="#f59e0b" stroke="#ca8a04" stroke-width="1.5" />
          
          <!-- Front Hood area & Windshield -->
          <rect x="14" y="6" width="20" height="4" rx="1.5" fill="#fef08a" opacity="0.3" />
          <!-- Dark charcoal black Windshield cover glass at front -->
          <rect x="13" y="11" width="22" height="4.5" rx="1" fill="#0f172a" />
          
          <!-- Front Silver bumper -->
          <rect x="14" y="2.5" width="20" height="1.5" rx="0.5" fill="#94a3b8" />
          
          <!-- Rear Silver bumper -->
          <rect x="14" y="44" width="20" height="1.5" rx="0.5" fill="#94a3b8" />

          <!-- Side passenger windows glass as visible from above -->
          <rect x="12" y="17.5" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          <rect x="34.5" y="17.5" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          <rect x="12" y="23.5" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          <rect x="34.5" y="23.5" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          <rect x="12" y="29.5" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          <rect x="34.5" y="29.5" width="1.5" height="4" rx="0.5" fill="#1e293b" />
          
          <!-- Roof details: Ribs for structured steel roof -->
          <line x1="16" y1="17" x2="32" y2="17" stroke="#ca8a04" stroke-width="1" />
          <line x1="16" y1="21" x2="32" y2="21" stroke="#ca8a04" stroke-width="1" />
          <line x1="16" y1="25" x2="32" y2="25" stroke="#ca8a04" stroke-width="1" />
          <line x1="16" y1="29" x2="32" y2="29" stroke="#ca8a04" stroke-width="1" />
          <line x1="16" y1="33" x2="32" y2="33" stroke="#ca8a04" stroke-width="1" />
          <line x1="16" y1="37" x2="32" y2="37" stroke="#ca8a04" stroke-width="1" />

          <!-- Emergency Escape Hatch on the roof center -->
          <rect x="18" y="21" width="12" height="8" rx="1.5" fill="#ffffff" stroke="#ca8a04" stroke-width="1" />
          <rect x="20" y="23" width="8" height="4" rx="0.5" fill="#fee2e2" />

          <!-- Warning strobe indicator lights -->
          <!-- Rear Warning lights -->
          <circle cx="15" cy="42" r="1.5" fill="#dc2626" />
          <circle cx="33" cy="42" r="1.5" fill="#dc2626" />
          <!-- Front warning lights -->
          <circle cx="15" cy="5" r="1.5" fill="#ea580c" />
          <circle cx="33" cy="5" r="1.5" fill="#ea580c" />
        </svg>
      </div>
    `;

    const busIcon = L.divIcon({
      html: busHtml,
      className: '!bg-transparent !border-none !shadow-none',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    busMarkerRef.current = L.marker(busCoords, { icon: busIcon }).addTo(map);

  }, [busCoords, busHeading]);

  // Turn-by-turn guidance values
  const nextTargetInfo = useMemo(() => {
    const isCompleted = currentSegment >= routePoints.length - 1;

    if (isCompleted) {
      return {
        title: "Arrived at School",
        distanceStr: "0 m",
        direction: "straight" as const,
        stopName: "Riara Primary School",
        student: null,
      };
    }

    const nextPt = routePoints[currentSegment + 1];
    const distanceMeters = Math.max(80, Math.ceil((1 - segmentProgress) * 750));

    // Simple procedural direction depending on bearing/coordinates
    let direction: 'left' | 'right' | 'straight' = 'straight';
    if (currentSegment % 3 === 1) direction = 'left';
    else if (currentSegment % 3 === 2) direction = 'right';

    return {
      title: `Next Stop: Drop-off #${nextPt.stopNumber}`,
      distanceStr: distanceMeters + " m",
      direction,
      stopName: nextPt.name,
      student: nextPt.student as Student | null,
    };
  }, [routePoints, currentSegment, segmentProgress]);

  // ETA Estimates for bottom overlay
  const etaStats = useMemo(() => {
    const remainingSegments = Math.max(0, routePoints.length - 1 - (currentSegment + segmentProgress));
    const distanceKm = parseFloat((remainingSegments * 0.7).toFixed(1));
    const durationMins = Math.ceil(remainingSegments * 2.1);

    const etaTime = new Date();
    etaTime.setMinutes(etaTime.getMinutes() + durationMins);
    const etaTimeString = etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      duration: durationMins,
      distanceStr: `${distanceKm} km`,
      etaTime: etaTimeString,
    };
  }, [routePoints, currentSegment, segmentProgress]);

  // Selected student drawer data helper
  const selectedStudentStop = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentStops.find(s => s.student.id === selectedStudentId) || null;
  }, [selectedStudentId, studentStops]);

  // Dismiss details card and reset states
  const handleMarkerAction = (student: Student, targetStatus: StudentStatus) => {
    if (onUpdateStudentStatus) {
      onUpdateStudentStatus(student.id, targetStatus);
      setToastMessage(`Updated ${student.name}'s status to ${targetStatus}!`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      
      {/* Immersive Floating Navigation Screen Card */}
      <div className={`relative ${isDarkMode ? 'bg-neutral-950 border-neutral-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-[2.5rem] shadow-2xl w-full max-w-lg h-[82vh] border overflow-hidden flex flex-col`}>
        
        {/* Leaflet Raw Map hook container */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
 
        {/* Floating Custom Map Controls (Overlayed React widgets) */}
        
        {/* TOP: Glassmorphic Google Maps turn-by-turn banner */}
        <div className="absolute top-4 left-4 right-4 z-[999] pointer-events-auto">
          <div className={`${isDarkMode ? 'bg-neutral-900/95 text-white border-neutral-800/40' : 'bg-white/95 text-slate-900 border-slate-200/50 shadow-md'} backdrop-blur-md p-4 rounded-3xl shadow-xl border flex items-center gap-3`}>
            {/* Brand Pink Road Arrow Container */}
            <div className="bg-[#E70D8D] p-3 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#E70D8D]/20">
              {nextTargetInfo.direction === 'left' && <Navigation className="w-6 h-6 transform -rotate-90" />}
              {nextTargetInfo.direction === 'right' && <Navigation className="w-6 h-6 transform rotate-90" />}
              {nextTargetInfo.direction === 'straight' && <Navigation className="w-6 h-6" />}
            </div>
 
            {/* Instruction Description */}
            <div className="flex-grow">
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-2xl font-black tracking-tight">{nextTargetInfo.distanceStr}</span>
                <span className="text-xs font-semibold text-[#E70D8D]">then</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-300' : 'text-slate-650'} font-bold mt-1 line-clamp-1`}>
                {nextTargetInfo.title === "Arrived at School" 
                  ? "Arrive at Riara Primary School Gate" 
                  : `Head north toward ${nextTargetInfo.stopName}`}
              </p>
            </div>
 
            {/* Lane guidance markers in picture */}
            <div className={`hidden sm:flex flex-col gap-1 items-center shrink-0 border-l ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'} pl-3`}>
              <div className="flex gap-1.5">
                <svg className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-4 4m4-4l4 4" />
                </svg>
                <svg className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-4 4m4-4l4 4" />
                </svg>
              </div>
              <div className={`text-[7px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'} font-black tracking-widest uppercase`}>
                2 LANES
              </div>
            </div>
          </div>
        </div>

        {/* Speedometer Widget (Overlay on Left Side) */}
        <div className="absolute left-4 top-28 z-[999] flex flex-col gap-2.5 pointer-events-auto">
          <div className={`${isDarkMode ? 'bg-neutral-900/90 border-neutral-800/40 text-white' : 'bg-white/95 border-slate-200/50 text-slate-900 shadow-md'} backdrop-blur-md rounded-2xl p-2.5 px-3.5 border shadow-xl flex items-center gap-3`}>
            {/* Speed limit circle sign */}
            <div className="w-8 h-8 rounded-full border-[3px] border-red-500 bg-white flex items-center justify-center shadow-xs">
              <span className="text-xs font-black text-black">50</span>
            </div>
            
            {/* Current speed digit readout */}
            <div className="flex flex-col">
              <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono leading-none`}>{speed}</span>
              <span className={`text-[8px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'} uppercase font-black tracking-widest mt-0.5`}>km/h</span>
            </div>
          </div>
        </div>

        {/* RIGHT TOP: Floating Circular Close Button */}
        <button 
          onClick={onClose}
          className={`absolute top-28 right-4 z-[999] ${isDarkMode ? 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-800/40' : 'bg-white/95 hover:bg-slate-100 text-slate-800 border-slate-200/50 shadow-md'} backdrop-blur-md p-2.5 rounded-full border shadow-xl flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95`}
          title="Close Navigation Map"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Global Temporary Feedback Toast Banner */}
        {toastMessage && (
          <div className={`absolute top-[40%] left-6 right-6 z-[999] ${isDarkMode ? 'bg-neutral-950/95 text-[#E70D8D] border-neutral-800' : 'bg-white/95 text-[#E70D8D] border-slate-250 shadow-lg'} text-center font-bold text-xs p-3.5 rounded-2xl border shadow-2xl animate-pulse`}>
            {toastMessage}
          </div>
        )}

        {/* Interactive Selected Stop Drawer (Only shown when clicking stop markers) */}
        {selectedStudentStop && (
          <div className={`absolute bottom-28 left-4 right-4 z-[999] ${isDarkMode ? 'bg-neutral-900/95 border-neutral-800/40 text-white' : 'bg-white/95 border-slate-200/50 text-slate-900 shadow-md'} backdrop-blur-md border rounded-3xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up pointer-events-auto`}>
            {/* Student Image/Initials */}
            <div className={`relative w-12 h-12 rounded-full border-2 ${isDarkMode ? 'border-neutral-800' : 'border-slate-100'} overflow-hidden shrink-0 shadow-md`}>
              {selectedStudentStop.student.imgUrl ? (
                <img 
                  src={selectedStudentStop.student.imgUrl} 
                  alt={selectedStudentStop.student.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#303690] text-indigo-200 text-xs font-extrabold flex items-center justify-center">
                  {getInitials(selectedStudentStop.student.name)}
                </div>
              )}
            </div>

            {/* Student Info descriptions details */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <span className={`font-bold text-sm truncate pr-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedStudentStop.student.name}</span>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  selectedStudentStop.student.status === StudentStatus.Boarded || selectedStudentStop.student.status === StudentStatus.Alighted
                    ? (isDarkMode ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-700') 
                    : selectedStudentStop.student.status === StudentStatus.Absent
                      ? (isDarkMode ? 'bg-red-950/50 text-red-400' : 'bg-red-50 text-red-700')
                      : (isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-550')
                }`}>
                  {selectedStudentStop.student.status}
                </span>
              </div>
              <p className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'} mt-1 truncate font-semibold uppercase`}>{selectedStudentStop.name}</p>
              
              {/* Manual Direct Status Actions inside Stop Details Drawer */}
              <div className="flex gap-2 mt-2.5">
                {selectedStudentStop.student.status === StudentStatus.NotBoarded && (
                  <>
                    <button 
                      onClick={() => handleMarkerAction(selectedStudentStop.student, StudentStatus.Boarded)}
                      className="px-3 py-1.5 text-[9px] bg-[#303690] hover:bg-[#252b7a] text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-1 shadow-md shadow-slate-950/30 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Board
                    </button>
                    <button 
                      onClick={() => handleMarkerAction(selectedStudentStop.student, StudentStatus.Absent)}
                      className={`px-3 py-1.5 text-[9px] ${isDarkMode ? 'bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-900/50' : 'bg-red-50 hover:bg-red-100 text-red-650 border-red-200'} border rounded-xl font-semibold uppercase tracking-wider transition-colors`}
                    >
                      Absent
                    </button>
                  </>
                )}
                {selectedStudentStop.student.status === StudentStatus.Boarded && (
                  <button 
                    onClick={() => handleMarkerAction(selectedStudentStop.student, StudentStatus.Alighted)}
                    className="px-3 py-1.5 text-[9px] bg-[#E70D8D] hover:bg-[#c90a77] text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-1 shadow-md shadow-pink-950/30 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Alight
                  </button>
                )}
                {(selectedStudentStop.student.status === StudentStatus.Alighted || selectedStudentStop.student.status === StudentStatus.Absent) && (
                  <button 
                    onClick={() => handleMarkerAction(selectedStudentStop.student, StudentStatus.NotBoarded)}
                    className={`px-2.5 py-1 text-[8px] ${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-650'} rounded-md transition-colors`}
                  >
                    Reset Status
                  </button>
                )}
              </div>
            </div>

            {/* Quick Dismiss Trigger */}
            <button 
              onClick={() => setSelectedStudentId(null)}
              className={`p-1 rounded-full ${isDarkMode ? 'text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800' : 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200'} self-start shrink-0`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BOTTOM: Translucent ETA Navigation Panel */}
        <div className="absolute bottom-4 left-4 right-4 z-[999] pointer-events-auto">
          <div className={`${isDarkMode ? 'bg-neutral-900/95 text-white border-neutral-800/40' : 'bg-white/95 text-slate-900 border-slate-200/50 shadow-md'} backdrop-blur-md p-4 rounded-3xl shadow-2xl border`}>
            {/* Top Row - Status Banner */}
            <div className={`flex justify-between items-center p-2 rounded-2xl border mb-3.5 ${isDarkMode ? 'bg-neutral-950/50 border-neutral-850/40' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E70D8D]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E70D8D] animate-pulse" />
                <span>Trip in Progress</span>
              </div>
              <div className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${isDarkMode ? 'text-white bg-neutral-800' : 'text-slate-800 bg-slate-100'}`}>
                {etaStats.etaTime} ETA
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="flex justify-between items-end">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#E70D8D] leading-none">{etaStats.duration}</span>
                  <span className="text-sm font-semibold text-[#E70D8D]">min</span>
                </div>
                <p className={`text-xs font-bold mt-1.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>{etaStats.distanceStr} remaining</p>
              </div>

              {/* Destination Readout */}
              <div className="text-right max-w-[150px]">
                <p className={`text-[8px] font-black uppercase tracking-widest leading-none ${isDarkMode ? 'text-neutral-400' : 'text-slate-450'}`}>Destination</p>
                <p className={`text-sm font-extrabold mt-1.5 truncate ${isDarkMode ? 'text-neutral-100' : 'text-slate-800'}`}>
                  {trip?.route?.name || "Riara Primary Gate"}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
