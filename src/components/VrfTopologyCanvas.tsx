import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Plus, Trash2, Info, Download, ZoomIn, ZoomOut, Maximize, FileText, Grid, Zap, Hand } from 'lucide-react';

interface VrfRoom {
  id: string;
  name: string;
  basis: 'area' | 'volume';
  size: number;
  occupants: number;
  tons: number;
  watts: number;
  pipeLength?: number;
}

interface VrfResults {
  totalConnectedTons: number;
  coincidentTons: number;
  oduHP: number;
  oduTons: number;
  oduWatts: number;
  combinationRatio: number;
  additionalCharge: number;
  autoHP: number;
  deratingFactor: number;
  deratedOduCapacityTons: number;
  hasCapacityDeficit: boolean;
  capacityDeficit: number;
  toxicLimitExceeded: boolean;
  toxicConcentration: number;
  smallestRoomName: string;
  smallestRoomVol: number;
  baseOduCharge: number;
  totalCharge: number;
}

interface VrfTopologyCanvasProps {
  vrfRooms: VrfRoom[];
  setVrfRooms: React.Dispatch<React.SetStateAction<VrfRoom[]>>;
  vrfResults: VrfResults;
  maxAllowedCr: number;
  diversityFactor: number;
  refrigerantType: 'R410A' | 'R32';
  pipeMaterial: 'Copper' | 'Steel' | 'PVC';
  pipingLength: number;
  mainPipingLength: number;
  setMainPipingLength: React.Dispatch<React.SetStateAction<number>>;
  calcRoomTonsAndWatts: (basis: 'area' | 'volume', size: number, occupants: number) => { watts: number; tons: number };
  triggerToast: (msg: string) => void;
  onCustomPipesChange?: (len: number | null) => void;
  isDarkMode?: boolean;
}


interface PipeSegmentData {
  id: string;
  name: string;
  length: number;
  downstreamTons: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const getPipeSizes = (tons: number) => {
  if (tons < 1.5) return { liquid: '1/4"', gas: '1/2"' };
  if (tons < 2.5) return { liquid: '1/4"', gas: '5/8"' };
  if (tons < 4.5) return { liquid: '3/8"', gas: '5/8"' };
  if (tons < 7.5) return { liquid: '3/8"', gas: '3/4"' };
  if (tons < 10.5) return { liquid: '3/8"', gas: '7/8"' };
  if (tons < 16.5) return { liquid: '1/2"', gas: '1-1/8"' };
  return { liquid: '5/8"', gas: '1-1/8"' };
};

const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
};

const checkPipeDistance = (px: number, py: number, startX: number, startY: number, endX: number, endY: number) => {
  if (Math.abs(startX - endX) > 1 && Math.abs(startY - endY) > 1) {
    const d1 = distToSegment(px, py, startX, startY, startX, endY);
    const d2 = distToSegment(px, py, startX, endY, endX, endY);
    return Math.min(d1, d2);
  } else {
    return distToSegment(px, py, startX, startY, endX, endY);
  }
};

interface NodePosition {
  x: number;
  y: number;
}

export default function VrfTopologyCanvas({
  vrfRooms,
  setVrfRooms,
  vrfResults,
  maxAllowedCr,
  diversityFactor,
  refrigerantType,
  pipeMaterial,
  pipingLength,
  mainPipingLength,
  setMainPipingLength,
  calcRoomTonsAndWatts,
  triggerToast,
   
  isDarkMode = true
}: VrfTopologyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout states

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 400 });
  const [isPanZoomMode, setIsPanZoomMode] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasDragged, setHasDragged] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isPanZoomMode) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomSensitivity = 0.001;
    const zoomDelta = -e.deltaY * zoomSensitivity;
    
    setZoom((prevZoom) => {
      const newZoom = Math.min(Math.max(0.2, prevZoom + zoomDelta), 5);
      
      // Calculate new pan to zoom towards mouse cursor
      setPan((prevPan) => {
        const x = mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom);
        const y = mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom);
        return { x, y };
      });
      
      return newZoom;
    });
  };
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFlowing, setIsFlowing] = useState<boolean>(true);
  const [hoveredPipe, setHoveredPipe] = useState<PipeSegmentData | null>(null);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  



  const pipeSegmentsRef = useRef<PipeSegmentData[]>([]);
  const animatedPositionsRef = useRef<Record<string, number>>({});

  const [pressureDropStats, setPressureDropStats] = useState({ maxDrop: 0, maxPathLen: 0, totalDrop: 0 });
  
  // Pan and Zoom states

  
  // New States

  const [isGridEnabled, setIsGridEnabled] = useState(false);
  const [isAutoLayout, setIsAutoLayout] = useState(true);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [customPipes, setCustomPipes] = useState([]);
  const drawingPipeRef = useRef<{startX: number, startY: number, endX: number, endY: number} | null>(null);

  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const customPositionsRef = useRef<Record<string, {x: number, y: number}>>({});



  useEffect(() => {
    let maxPathLength = 0;
    let totalLength = mainPipingLength;
    
    // Friction loss coefficient based on pipe material
    let frictionFactor = 1.5; // Default (Copper)
    if (pipeMaterial === 'Steel') frictionFactor = 2.5;
    else if (pipeMaterial === 'PVC') frictionFactor = 1.2;

    let currentPathHeader = mainPipingLength;
    let totalDrop = mainPipingLength * frictionFactor;

    vrfRooms.forEach((room, index) => {
      const branchLen = room.pipeLength ?? 15;
      totalLength += branchLen;
      totalDrop += branchLen * frictionFactor;
      
      const pathLen = currentPathHeader + branchLen;
      if (pathLen > maxPathLength) {
        maxPathLength = pathLen;
      }
      
      if (index < vrfRooms.length - 1) {
        currentPathHeader += 1; // 1m for intermediate header
        totalLength += 1;
        totalDrop += 1 * frictionFactor;
      }
    });

    setPressureDropStats({ maxDrop: maxPathLength * frictionFactor, maxPathLen: maxPathLength, totalDrop });
  }, [vrfRooms, mainPipingLength, pipeMaterial]);



  
  // Animation tickers
  const animationFrameId = useRef<number | null>(null);
  const particleOffset = useRef<number>(0);
  const fanAngle = useRef<number>(0);

  // Dynamic Height based on number of FCUs (daisy chain)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const newWidth = Math.max(width, 400);
        const minHeight = 400;
        const requiredHeight = Math.max(minHeight, vrfRooms.length * 85 + 100);
        setDimensions({ width: newWidth, height: requiredHeight });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [vrfRooms.length]);

  // Positions map for click detection
  const positionsRef = useRef<Record<string, NodePosition>>({});

  // 3. Canvas Mouse Event Handlers




  const handleOptimizeRouting = () => {
    const sorted = [...vrfRooms].sort((a, b) => b.tons - a.tons);
    setVrfRooms(sorted);
    
    const startY = 140;
    const newPositions = {};
    newPositions['odu'] = { x: 80, y: 80 };
    
    sorted.forEach((r, i) => {
      newPositions[r.id] = { x: 120 + (i * 100), y: startY + 120 };
    });
    
    customPositionsRef.current = newPositions;
     
  triggerToast('Routing optimized: FCUs aligned and sorted by load!');
  };

  const handleExportBOM = () => {
    let csv = 'Item Type,Component,Material,Diameter (OD),Quantity,Unit\n';
    
    const liquidPipes: Record<string, number> = {};
    const gasPipes: Record<string, number> = {};
    const yBranchesLiquid: Record<string, number> = {};
    const yBranchesGas: Record<string, number> = {};

    let currentTons = vrfResults.totalConnectedTons;
    
    // Main Pipe
    let currentSizes = getPipeSizes(currentTons);
    liquidPipes[currentSizes.liquid] = (liquidPipes[currentSizes.liquid] || 0) + mainPipingLength;
    gasPipes[currentSizes.gas] = (gasPipes[currentSizes.gas] || 0) + mainPipingLength;
    
    vrfRooms.forEach((room, index) => {
      // Y-Branch Refnet
      if (index < vrfRooms.length - 1) {
        yBranchesLiquid[currentSizes.liquid] = (yBranchesLiquid[currentSizes.liquid] || 0) + 1;
        yBranchesGas[currentSizes.gas] = (yBranchesGas[currentSizes.gas] || 0) + 1;
      }

      // Branch to FCU
      const branchSizes = getPipeSizes(room.tons);
      const branchLen = room.pipeLength ?? 15;
      liquidPipes[branchSizes.liquid] = (liquidPipes[branchSizes.liquid] || 0) + branchLen;
      gasPipes[branchSizes.gas] = (gasPipes[branchSizes.gas] || 0) + branchLen;

      // Pipe to next header
      if (index < vrfRooms.length - 1) {
        currentTons -= room.tons;
        currentSizes = getPipeSizes(currentTons);
        liquidPipes[currentSizes.liquid] = (liquidPipes[currentSizes.liquid] || 0) + 1; // 1m header pipe
        gasPipes[currentSizes.gas] = (gasPipes[currentSizes.gas] || 0) + 1;
      }
    });

    Object.entries(liquidPipes).forEach(([size, len]) => {
      csv += `Pipe,Liquid Line,${pipeMaterial},${size},${(len || 0).toFixed(2)},meters\n`;
    });
    Object.entries(gasPipes).forEach(([size, len]) => {
      csv += `Pipe,Suction Gas Line,${pipeMaterial},${size},${(len || 0).toFixed(2)},meters\n`;
    });
    Object.entries(yBranchesLiquid).forEach(([size, count]) => {
      csv += `Fitting,Y-Branch Refnet (Liquid),Copper,${size},${count},pcs\n`;
    });
    Object.entries(yBranchesGas).forEach(([size, count]) => {
      csv += `Fitting,Y-Branch Refnet (Gas),Copper,${size},${count},pcs\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vrf_piping_bom_${Date.now()}.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
     
  triggerToast('BOM Schedule Exported successfully!');
  };

  const handleExportDxf = () => {
    let dxf = '0\nSECTION\n2\nENTITIES\n';

    const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
      const scale = 5;
      dxf += `0\nLINE\n8\n${layer}\n10\n${x1 * scale}\n20\n${-y1 * scale}\n11\n${x2 * scale}\n21\n${-y2 * scale}\n`;
    };

    const addText = (x: number, y: number, text: string, height: number, layer: string) => {
      const scale = 5;
      dxf += `0\nTEXT\n8\n${layer}\n10\n${x * scale}\n20\n${-y * scale}\n40\n${height * scale}\n1\n${text}\n`;
    };

    const addRect = (x: number, y: number, w: number, h: number, layer: string) => {
      addLine(x, y, x + w, y, layer);
      addLine(x + w, y, x + w, y + h, layer);
      addLine(x + w, y + h, x, y + h, layer);
      addLine(x, y + h, x, y, layer);
    };

    const addPipeSegment = (x1: number, y1: number, x2: number, y2: number, type: 'liquid' | 'suction') => {
      const layer = type === 'liquid' ? 'LIQUID_LINE' : 'SUCTION_LINE';
      const offset = type === 'liquid' ? 4 : -4;
      
      let sx = x1, sy = y1, ex = x2, ey = y2;
      if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
        sy += offset; ey += offset;
      } else {
        sx += offset; ex += offset;
      }

      if (Math.abs(sx - ex) > 1 && Math.abs(sy - ey) > 1) {
        addLine(sx, sy, sx, ey, layer);
        addLine(sx, ey, ex, ey, layer);
      } else {
        addLine(sx, sy, ex, ey, layer);
      }
    };

    const oduPos = customPositionsRef.current['odu'] || { x: 80, y: 80 };

    const numModules = Math.max(1, Math.ceil(vrfResults.oduHP / 28));
    const trunkStartX = oduPos.x + ((numModules - 1) * 55);
    const trunkStartY = oduPos.y + 45;
    
    // Draw CDUs
    for (let i = 0; i < numModules; i++) {
        const modX = oduPos.x + (i * 110);
        const modY = oduPos.y;
        addRect(modX - 45, modY - 45, 90, 90, 'EQUIPMENT');
        addText(modX - 40, modY, 'CDU', 12, 'TEXT');
    }
    if (numModules > 1) {
        const firstX = oduPos.x;
        const lastX = oduPos.x + ((numModules - 1) * 110);
        addPipeSegment(firstX, oduPos.y + 45, lastX, oduPos.y + 45, 'liquid');
        addPipeSegment(firstX, oduPos.y + 45, lastX, oduPos.y + 45, 'suction');
    }
    
    if (vrfRooms.length > 0) {
      let prevBranchPoint = { x: trunkStartX, y: trunkStartY };
      const firstPos = customPositionsRef.current[vrfRooms[0].id] || { x: 300, y: 140 };
      const lastPos = customPositionsRef.current[vrfRooms[vrfRooms.length - 1].id] || { x: 300, y: 140 + (vrfRooms.length - 1) * 85 };
      const isHorizontalLayout = Math.abs(lastPos.x - firstPos.x) > Math.abs(lastPos.y - firstPos.y) + 50;

      vrfRooms.forEach((room, index) => {
        const isLast = index === vrfRooms.length - 1;
        const currentY = 140 + (index * 85);
        const roomPos = customPositionsRef.current[room.id] || { x: 300, y: currentY };
        
        const branchPoint = isHorizontalLayout 
           ? { x: roomPos.x, y: roomPos.y - 60 } 
           : { x: roomPos.x - 120, y: roomPos.y };
           
        // Main Header to branch point
        addPipeSegment(prevBranchPoint.x, prevBranchPoint.y, branchPoint.x, branchPoint.y, 'liquid');
        addPipeSegment(prevBranchPoint.x, prevBranchPoint.y, branchPoint.x, branchPoint.y, 'suction');
        
        // Branch point to FCU
        addPipeSegment(branchPoint.x, branchPoint.y, roomPos.x, roomPos.y, 'liquid');
        addPipeSegment(branchPoint.x, branchPoint.y, roomPos.x, roomPos.y, 'suction');

        // FCU Node
        addRect(roomPos.x - 45, roomPos.y - 20, 90, 40, 'EQUIPMENT');
        let shortName = room.name;
        if (shortName.length > 12) shortName = shortName.substring(0, 11) + '…';
        addText(roomPos.x - 40, roomPos.y - 2, shortName, 10, 'TEXT');
        addText(roomPos.x - 40, roomPos.y + 12, '${(room.tons || 0).toFixed(1)} TR', 10, 'TEXT');
        
        prevBranchPoint = branchPoint;
      });
    }

    dxf += '0\nENDSEC\n0\nEOF\n';


    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vrf_piping_schematic_${Date.now()}.dxf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
     
  triggerToast('DXF Exported successfully!');
  };

  


  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const x = (screenX - pan.x) / zoom;
    const y = (screenY - pan.y) / zoom;

    if (isPanZoomMode && isDragging) {
      setHasDragged(true);
      setPan(prev => ({
        x: prev.x + (screenX - dragStart.x),
        y: prev.y + (screenY - dragStart.y)
      }));
      setDragStart({ x: screenX, y: screenY });
      return;
    }

    if (isDrawMode && drawingPipeRef.current) {
      let snapX = x;
      let snapY = y;
      if (isGridEnabled) {
        snapX = Math.round(snapX / 20) * 20;
        snapY = Math.round(snapY / 20) * 20;
      }
      // Orthogonal lock with Shift
      if (e.shiftKey) {
        if (Math.abs(snapX - drawingPipeRef.current.startX) > Math.abs(snapY - drawingPipeRef.current.startY)) {
          snapY = drawingPipeRef.current.startY;
        } else {
          snapX = drawingPipeRef.current.startX;
        }
      }
      drawingPipeRef.current = { ...drawingPipeRef.current, endX: snapX, endY: snapY };
      return;
    }


    if (draggedNodeId) {
      setHasDragged(true);
      let targetX = x;
      let targetY = y;
      if (isGridEnabled) {
        targetX = Math.round(targetX / 20) * 20;
        targetY = Math.round(targetY / 20) * 20;
      }
      customPositionsRef.current[draggedNodeId] = { x: targetX, y: targetY };
    }

    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Hover state
    let hoveredId = null;
    let newHoveredPipe: PipeSegmentData | null = null;
    const posOdu = positionsRef.current['odu'];
    

    const numModules = Math.max(1, Math.ceil(vrfResults.oduHP / 28));
    const oduWidth = 90 + ((numModules - 1) * 110);
    
    if (posOdu && x >= (posOdu.x - 45) && x <= (posOdu.x - 45 + oduWidth) && Math.abs(y - posOdu.y) < 45) {
      hoveredId = 'odu';
    } else {
      for (const room of vrfRooms) {
        const pos = positionsRef.current[room.id];
        if (pos && Math.abs(x - pos.x) < 45 && Math.abs(y - pos.y) < 22) {
          hoveredId = room.id;
          break;
        }
      }
    }
    
    if (!hoveredId) {
      for (const pipe of pipeSegmentsRef.current) {
        const dist = checkPipeDistance(x, y, pipe.startX, pipe.startY, pipe.endX, pipe.endY);
        if (dist < 12) { // 12px hover radius
          newHoveredPipe = pipe;
          break;
        }
      }
    }
    
    setHoveredNodeId(hoveredId);
    setHoveredPipe(newHoveredPipe);
  };


  const handleMouseLeave = () => {
    drawingPipeRef.current = null;
    setHoveredNodeId(null);
    setHoveredPipe(null);
    setIsDragging(false);
    setDraggedNodeId(null);
  };




  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const x = (screenX - pan.x) / zoom;
    const y = (screenY - pan.y) / zoom;

    if (isPanZoomMode) {
      setIsDragging(true);
      setDragStart({ x: screenX, y: screenY });
      return;
    }

    if (isDrawMode) {
      let snapX = x;
      let snapY = y;
      
      // Basic snapping to grid or nodes
      if (isGridEnabled) {
        snapX = Math.round(snapX / 20) * 20;
        snapY = Math.round(snapY / 20) * 20;
      }
      drawingPipeRef.current = { startX: snapX, startY: snapY, endX: snapX, endY: snapY };
      return;
    }

    
    // Check if clicked on a node to drag it
    let clickedNodeId = null;
    const posOdu = positionsRef.current['odu'];

    const numModules = Math.max(1, Math.ceil(vrfResults.oduHP / 28));
    const oduWidth = 90 + ((numModules - 1) * 110);
    
    if (posOdu && x >= (posOdu.x - 45) && x <= (posOdu.x - 45 + oduWidth) && Math.abs(y - posOdu.y) < 45) {
      clickedNodeId = 'odu';
    } else {
      for (const room of vrfRooms) {
        const pos = positionsRef.current[room.id];
        if (pos && Math.abs(x - pos.x) < 45 && Math.abs(y - pos.y) < 22) {
          clickedNodeId = room.id;
          break;
        }
      }
    }

    if (clickedNodeId) {
      setDraggedNodeId(clickedNodeId);
      setIsDragging(false); // We are dragging a node, not panning
    } else {
      setIsDragging(true); // Panning
    }
    
    setHasDragged(false);
    setDragStart({ x: screenX, y: screenY });
  };




  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawMode && drawingPipeRef.current) {
      if (Math.abs(drawingPipeRef.current.startX - drawingPipeRef.current.endX) > 5 || Math.abs(drawingPipeRef.current.startY - drawingPipeRef.current.endY) > 5) {
        setCustomPipes([...customPipes, { id: 'pipe-${Date.now()}', ...drawingPipeRef.current }]);
      }
      drawingPipeRef.current = null;
      return;
    }

    setIsDragging(false);

    
    if (draggedNodeId) {
      if (!hasDragged) {
        setSelectedNodeId(draggedNodeId);
      }
      setDraggedNodeId(null);
      return;
    }
    
    if (!hasDragged) {
      setSelectedNodeId(null); // Clicked on empty space
    }
  };



  // 4. Drawing Logic using Canvas 2D Context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;




    const render = () => {
      const theme = {
        bg: isDarkMode ? '#020617' : '#f8fafc',
        gridLines: isDarkMode ? '#334155' : '#e2e8f0',
        gridAxes: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(203, 213, 225, 0.4)',
        pipeHover: isDarkMode ? '#ffffff' : '#020617',
        jointFill: isDarkMode ? '#1e293b' : '#f1f5f9',
        jointStroke: isDarkMode ? '#94a3b8' : '#64748b',
        jointDarkStroke: isDarkMode ? '#64748b' : '#cbd5e1',
        textMain: isDarkMode ? '#ffffff' : '#0f172a',
        textMuted: isDarkMode ? '#94a3b8' : '#64748b',
        fcuFill: isDarkMode ? '#1e293b' : '#ffffff',
        fcuStroke: isDarkMode ? '#475569' : '#cbd5e1',
        fcuGrill: isDarkMode ? '#334155' : '#e2e8f0',
        oduFill: isDarkMode ? '#0f172a' : '#f1f5f9',
        oduModule: isDarkMode ? '#1e293b' : '#ffffff',
        oduFan: isDarkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.3)',
        oduFanCenter: isDarkMode ? '#334155' : '#94a3b8',
        tooltipBg: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: isDarkMode ? '#334155' : '#e2e8f0',
        toxic: '#ef4444',
        ok: '#10b981',
      };

      ctx.fillStyle = theme.bg; // slate-950
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      

      ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);

      if (isGridEnabled) {
        ctx.strokeStyle = theme.gridLines;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        // Draw grid that covers the viewport area + padding based on pan/zoom
        const startX = -pan.x / zoom - 1000;
        const endX = (dimensions.width - pan.x) / zoom + 1000;
        const startY = -pan.y / zoom - 1000;
        const endY = (dimensions.height - pan.y) / zoom + 1000;
        
        for (let x = Math.floor(startX / 20) * 20; x < endX; x += 20) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = Math.floor(startY / 20) * 20; y < endY; y += 20) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();
      }

      pipeSegmentsRef.current = [];


      
      // Calculate targets and animate
      let targetY = 140;
      const roomTargets: Record<string, number> = {};
      vrfRooms.forEach((room) => {
        roomTargets[room.id] = targetY;
        targetY += 85;
      });

      vrfRooms.forEach((room) => {
        if (animatedPositionsRef.current[room.id] === undefined) {
          animatedPositionsRef.current[room.id] = roomTargets[room.id];
        } else {
          const diff = roomTargets[room.id] - animatedPositionsRef.current[room.id];
          animatedPositionsRef.current[room.id] += diff * 0.12;
        }
      });



      ctx.strokeStyle = theme.gridAxes;
      ctx.lineWidth = 1 / zoom;
      const gridSize = 30;
      for (let x = 0; x < dimensions.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dimensions.height); ctx.stroke();
      }
      for (let y = 0; y < dimensions.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dimensions.width, y); ctx.stroke();
      }

      if (isFlowing) {
        particleOffset.current = (particleOffset.current + 1.2) % 60;
        fanAngle.current = (fanAngle.current + 0.12) % (Math.PI * 2);
      }


      const drawYBranchJoint = (x: number, y: number, rotation: number = 0, isHovered: boolean = false) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.fillStyle = theme.jointFill;
        ctx.strokeStyle = isHovered ? '#38bdf8' : theme.jointStroke;
        ctx.lineWidth = (isHovered ? 2 : 1.5) / zoom;
        
        if (isHovered) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.moveTo(-5, 6);
        ctx.lineTo(5, 6);
        ctx.lineTo(10, -4);
        ctx.lineTo(4, -8);
        ctx.lineTo(0, -3);
        ctx.lineTo(-4, -8);
        ctx.lineTo(-10, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = theme.jointDarkStroke;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -3);
        ctx.stroke();
        
        ctx.restore();
      };

      const drawPipeSegment = (
        x1: number, y1: number, x2: number, y2: number, 
        type: 'liquid' | 'suction',
        isHovered: boolean = false
      ) => {
        const isLiquid = type === 'liquid';
        const pipeColor = isLiquid ? '#38bdf8' : '#fb923c'; 
        const offset = isLiquid ? 4 : -4;

        ctx.beginPath();
        ctx.strokeStyle = isHovered ? '#ffffff' : pipeColor;
        ctx.lineWidth = (isHovered ? 4 : 3) / zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (isHovered) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = pipeColor;
        } else {
          ctx.shadowBlur = 0;
        }


        let startX = x1; let startY = y1;
        let endX = x2; let endY = y2;

        if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
          startY += offset; endY += offset;
        } else {
          startX += offset; endX += offset;
        }

        ctx.moveTo(startX, startY);
        
        // Orthogonal routing with elbow
        if (Math.abs(startX - endX) > 1 && Math.abs(startY - endY) > 1) {
          const midX = startX;
          const midY = endY;
          ctx.lineTo(midX, midY);
        }
        
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Particles
        if (isFlowing) {
          const dx = endX - startX;
          const dy = endY - startY;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          if (length > 20) {
            ctx.fillStyle = theme.pipeHover;
            ctx.shadowColor = pipeColor;
            ctx.shadowBlur = 6;

            const spacing = 40;
            const segments = Math.floor(length / spacing);
            
            for (let i = 0; i <= segments; i++) {
              let t = ((i * spacing) + particleOffset.current) / length;
              if (t > 1) t = t - 1;
              if (t < 0) t = 0;
              
              let px = startX;
              let py = startY;
              
              // Map t to orthogonal path
              if (Math.abs(startX - endX) > 1 && Math.abs(startY - endY) > 1) {
                const dist1 = Math.abs(endY - startY);
                const dist2 = Math.abs(endX - startX);
                const totalDist = dist1 + dist2;
                const currentDist = t * totalDist;
                
                if (currentDist <= dist1) {
                  py = startY + (currentDist * Math.sign(endY - startY));
                  px = startX;
                } else {
                  py = endY;
                  px = startX + ((currentDist - dist1) * Math.sign(endX - startX));
                }
              } else {
                 px = startX + (endX - startX) * t;
                 py = startY + (endY - startY) * t;
              }

              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.shadowBlur = 0;
          }
        }
      };



      // Auto vs Custom Topology Layout
      const oduPos = customPositionsRef.current['odu'] || { x: 80, y: 80 };
      positionsRef.current['odu'] = oduPos;

      const numModules = Math.max(1, Math.ceil(vrfResults.oduHP / 28));
      const trunkStartX = oduPos.x + ((numModules - 1) * 55);
      const trunkStartY = oduPos.y + 45;

      // Pre-calculate positions to determine layout orientation
      vrfRooms.forEach((room, index) => {
        const currentY = animatedPositionsRef.current[room.id] || 140;
        const defaultX = 300;
        const roomPos = customPositionsRef.current[room.id] || { x: defaultX, y: currentY };
        positionsRef.current[room.id] = roomPos;
      });

      if (isAutoLayout) {
        if (vrfRooms.length > 0) {
          let prevBranchPoint = { x: trunkStartX, y: trunkStartY };
          
          const firstPos = positionsRef.current[vrfRooms[0].id];
          const lastPos = positionsRef.current[vrfRooms[vrfRooms.length - 1].id];
          const isHorizontalLayout = Math.abs(lastPos.x - firstPos.x) > Math.abs(lastPos.y - firstPos.y) + 50;
          
          vrfRooms.forEach((room, index) => {
            const isLast = index === vrfRooms.length - 1;
            const roomPos = positionsRef.current[room.id];
            
            const branchPoint = isHorizontalLayout 
               ? { x: roomPos.x, y: roomPos.y - 60 } 
               : { x: roomPos.x - 120, y: roomPos.y };
               
            const isHeaderHovered = hoveredPipe?.id === `header-${index}`;
            drawPipeSegment(prevBranchPoint.x, prevBranchPoint.y, branchPoint.x, branchPoint.y, 'liquid', isHeaderHovered);
            drawPipeSegment(prevBranchPoint.x, prevBranchPoint.y, branchPoint.x, branchPoint.y, 'suction', isHeaderHovered);
            
            if (index === 0) {
               pipeSegmentsRef.current.push({ id: 'main-pipe', name: 'Main Pipe', length: mainPipingLength, downstreamTons: vrfResults.totalConnectedTons, startX: prevBranchPoint.x, startY: prevBranchPoint.y, endX: branchPoint.x, endY: branchPoint.y });
            } else {
               let remainingTons = 0;
               for (let j = index; j < vrfRooms.length; j++) { remainingTons += vrfRooms[j].tons; }
               pipeSegmentsRef.current.push({ id: `header-${index-1}`, name: "Intermediate Header", length: 1, downstreamTons: remainingTons, startX: prevBranchPoint.x, startY: prevBranchPoint.y, endX: branchPoint.x, endY: branchPoint.y });
            }

            const isBranchHovered = hoveredPipe?.id === `branch-${room.id}`;
            drawPipeSegment(branchPoint.x, branchPoint.y, roomPos.x, roomPos.y, 'liquid', isBranchHovered);
            drawPipeSegment(branchPoint.x, branchPoint.y, roomPos.x, roomPos.y, 'suction', isBranchHovered);
            pipeSegmentsRef.current.push({ id: `branch-${room.id}`, name: `Branch: ${room.name}`, length: room.pipeLength ?? 15, downstreamTons: room.tons, startX: branchPoint.x, startY: branchPoint.y, endX: roomPos.x, endY: roomPos.y });

            if (!isLast) {
              const rotation = isHorizontalLayout ? Math.PI / 2 : 0;
              drawYBranchJoint(branchPoint.x, branchPoint.y, rotation, isHeaderHovered);
            } else {
              ctx.fillStyle = theme.gridLines; ctx.strokeStyle = theme.jointDarkStroke; ctx.lineWidth = 1.5 / zoom; ctx.beginPath();
              ctx.arc(branchPoint.x, branchPoint.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }

            prevBranchPoint = branchPoint;
          });
        }
      } else {
        // Draw Custom Pipes
        
        // Evaluate Custom Pipes (Graph Traversal to Auto Size Pipes)
        const vertices = [];
        vertices.push({ id: 'odu', x: trunkStartX, y: trunkStartY, type: 'odu', tons: 0 });
        
        vrfRooms.forEach(room => {
          const pos = positionsRef.current[room.id];
          vertices.push({ id: room.id, x: pos.x, y: pos.y, type: 'fcu', tons: room.tons });
        });

        const getVertex = (x, y) => {
           for (const v of vertices) {
              if (Math.hypot(v.x - x, v.y - y) < 40) return v;
           }
           const newV = { x, y, id: 'joint-${Math.random()}', type: 'joint', tons: 0 };
           vertices.push(newV);
           return newV;
        };

        const edges = customPipes.map(p => {
           const v1 = getVertex(p.startX, p.startY);
           const v2 = getVertex(p.endX, p.endY);
           return { id: p.id, v1, v2, pipe: p, downstreamTons: 0, startX: v1.x, startY: v1.y, endX: v2.x, endY: v2.y };
        });

        const oduV = vertices.find(v => v.type === 'odu');
        if (oduV) {
          const visited = new Set();
          const traverse = (currentV, parentV) => {
             visited.add(currentV.id);
             let totalTons = currentV.type === 'fcu' ? currentV.tons : 0;
             for (const edge of edges) {
               if (edge.v1.id === currentV.id && edge.v2.id !== parentV?.id && !visited.has(edge.v2.id)) {
                  const childTons = traverse(edge.v2, currentV);
                  edge.downstreamTons = childTons;
                  totalTons += childTons;
               } else if (edge.v2.id === currentV.id && edge.v1.id !== parentV?.id && !visited.has(edge.v1.id)) {
                  const childTons = traverse(edge.v1, currentV);
                  edge.downstreamTons = childTons;
                  totalTons += childTons;
               }
             }
             return totalTons;
          };
          traverse(oduV, null);
        }
        
        edges.forEach(edge => {
          const isHovered = hoveredPipe?.id === edge.id;
          drawPipeSegment(edge.startX, edge.startY, edge.endX, edge.endY, 'liquid', isHovered);
          drawPipeSegment(edge.startX, edge.startY, edge.endX, edge.endY, 'suction', isHovered);
          
          pipeSegmentsRef.current.push({
             id: edge.id,
             name: 'Custom Pipe',
             length: Math.hypot(edge.startX - edge.endX, edge.startY - edge.endY) / 20, // 20px = 1m
             downstreamTons: edge.downstreamTons,
             startX: edge.startX,
             startY: edge.startY,
             endX: edge.endX,
             endY: edge.endY
          });
          
          if (edge.downstreamTons > 0) {
            ctx.fillStyle = theme.ok;
            ctx.font = 'bold 9px monospace';
            const midX = (edge.startX + edge.endX) / 2;
            const midY = (edge.startY + edge.endY) / 2;
            ctx.fillText(`${(edge.downstreamTons || 0).toFixed(1)} TR`, midX, midY - 10);
            
            const sizes = getPipeSizes(edge.downstreamTons);
            ctx.fillStyle = theme.textMuted;
            ctx.font = '8px monospace';
            ctx.fillText(`${sizes.liquid} / ${sizes.gas}`, midX, midY + 14);
          }
        });
        
        vertices.filter(v => v.type === 'joint').forEach(j => {
          drawYBranchJoint(j.x, j.y, Math.PI / 2, false);
        });

        // Render currently drawing pipe
        if (drawingPipeRef.current) {
           drawPipeSegment(drawingPipeRef.current.startX, drawingPipeRef.current.startY, drawingPipeRef.current.endX, drawingPipeRef.current.endY, 'liquid', true);
           drawPipeSegment(drawingPipeRef.current.startX, drawingPipeRef.current.startY, drawingPipeRef.current.endX, drawingPipeRef.current.endY, 'suction', true);
        }
      }

      vrfRooms.forEach((room, index) => {
        const isSelected = selectedNodeId === room.id;
        const isHovered = hoveredNodeId === room.id;
        const roomPos = positionsRef.current[room.id];
        const isSmallestLeakHazard = vrfResults.toxicLimitExceeded && vrfResults.smallestRoomName === room.name;

        ctx.fillStyle = theme.fcuFill; 
        ctx.strokeStyle = isSelected ? '#10b981' : isSmallestLeakHazard ? theme.toxic : isHovered ? '#38bdf8' : theme.fcuStroke;
        ctx.lineWidth = (isSelected ? 3 : 1.5) / zoom;
        ctx.shadowBlur = isSelected ? 10 : isHovered ? 5 : 0;
        ctx.shadowColor = ctx.strokeStyle;
        
        ctx.beginPath();
        ctx.roundRect(roomPos.x - 45, roomPos.y - 20, 90, 40, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = theme.fcuGrill;
        ctx.fillRect(roomPos.x - 40, roomPos.y - 15, 80, 24);
        ctx.fillStyle = isHovered ? '#38bdf8' : theme.textMuted;
        ctx.fillRect(roomPos.x - 30, roomPos.y + 12, 60, 4);

        ctx.fillStyle = theme.textMain;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        let shortName = room.name;
        if (shortName.length > 12) shortName = shortName.substring(0, 11) + '…';
        ctx.fillText(shortName, roomPos.x, roomPos.y - 2);

        ctx.fillStyle = theme.ok;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${(room.tons || 0).toFixed(1)} TR`, roomPos.x, roomPos.y + 8);
        
        // Branch Pipe Length Tag
        if (isAutoLayout) {
          const currentY = animatedPositionsRef.current[room.id] || 140;
          
          ctx.fillStyle = theme.textMuted;
          ctx.font = '9px monospace';
          ctx.fillText(`${room.pipeLength ?? 15}m`, (180 + roomPos.x)/2, currentY - 8);
        }

        if (isSmallestLeakHazard) {
          ctx.fillStyle = theme.toxic;
          ctx.beginPath();
          ctx.moveTo(roomPos.x - 45, roomPos.y - 32);
          ctx.lineTo(roomPos.x - 37, roomPos.y - 18);
          ctx.lineTo(roomPos.x - 53, roomPos.y - 18);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = theme.textMain;
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('!', roomPos.x - 45, roomPos.y - 20);
        }
      });


      // Draw Modular CDUs
      const maxModuleSize = 28;
      const baseHpPerModule = Math.floor(vrfResults.oduHP / numModules);
      let remainderHp = vrfResults.oduHP % numModules;

      const isOduCrCritical = vrfResults.combinationRatio > maxAllowedCr;
      const isOduCrWarning = vrfResults.combinationRatio < 50 || vrfResults.hasCapacityDeficit;
      const oduColor = isOduCrCritical ? '#f43f5e' : isOduCrWarning ? '#fbbf24' : '#10b981';

      // The main pipe goes from the last module's x position + 45
      // Wait, let's keep the oduPos as the center of the first module
      for (let i = 0; i < numModules; i++) {
        const moduleHp = baseHpPerModule + (i < remainderHp ? 1 : 0);
        const modX = oduPos.x + (i * 110);
        const modY = oduPos.y;

        ctx.fillStyle = theme.oduFill;
        ctx.strokeStyle = oduColor;
        ctx.lineWidth = (selectedNodeId === 'odu' ? 4 : 2) / zoom;
        ctx.shadowBlur = selectedNodeId === 'odu' ? 12 : hoveredNodeId === 'odu' ? 6 : 0;
        ctx.shadowColor = ctx.strokeStyle;

        ctx.beginPath();
        ctx.roundRect(modX - 45, modY - 45, 90, 90, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = theme.oduModule;
        ctx.fillRect(modX - 40, modY - 41, 80, 8);
        ctx.fillRect(modX - 40, modY + 33, 80, 8);

        ctx.save();
        ctx.translate(modX, modY - 3);
        ctx.rotate(fanAngle.current);
        ctx.fillStyle = theme.oduFan;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = isFlowing ? 'rgba(56, 189, 248, 0.4)' : 'rgba(100, 116, 139, 0.4)';
        for (let j = 0; j < 3; j++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.ellipse(0, -15, 8, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = theme.oduFanCenter;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ODU Label
        ctx.fillStyle = theme.textMain;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`CDU ${moduleHp}HP`, modX, modY + 28);
      }

      // Draw manifold connecting CDUs if numModules > 1
      if (numModules > 1) {
        const firstX = oduPos.x;
        const lastX = oduPos.x + ((numModules - 1) * 110);
        drawPipeSegment(firstX, oduPos.y + 45, lastX, oduPos.y + 45, 'liquid');
        drawPipeSegment(firstX, oduPos.y + 45, lastX, oduPos.y + 45, 'suction');
      }

      ctx.fillStyle = theme.textMain;
      ctx.font = 'extrabold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ODU', oduPos.x, oduPos.y - 18);
      
      ctx.fillStyle = theme.textMuted;
      ctx.font = '10px monospace';
      ctx.fillText(`(${(vrfResults.oduTons || 0).toFixed(1)} TR)`, oduPos.x, oduPos.y - 8);

      if (isOduCrCritical) {
        ctx.fillStyle = theme.toxic;
        ctx.fillRect(oduPos.x - 45, oduPos.y + 32, 90, 14);
        ctx.fillStyle = theme.textMain;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('LIMIT EXCEEDED', oduPos.x, oduPos.y + 42);
      } else {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fillRect(oduPos.x - 45, oduPos.y + 32, 90, 14);
        ctx.fillStyle = theme.ok;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`CR: ${(vrfResults.combinationRatio || 0).toFixed(0)}% OK`, oduPos.x, oduPos.y + 42);
      }
      
      // Main Pipe Length Tag
      if (vrfRooms.length > 0) {
        ctx.fillStyle = theme.tooltipBg;
        ctx.strokeStyle = theme.tooltipBorder;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.roundRect((oduPos.x + 180)/2 - 45, oduPos.y - 25, 90, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.textMain;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`Main: ${mainPipingLength}m`, (oduPos.x + 180)/2, oduPos.y - 12);
      }
      ctx.restore();

      localFrameId = requestAnimationFrame(render);
    };

    localFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(localFrameId);
    };
  }, [
    dimensions.width, dimensions.height, vrfRooms, selectedNodeId, hoveredNodeId, isFlowing, 
    vrfResults, maxAllowedCr, refrigerantType, mainPipingLength, hoveredPipe, zoom, pan, isGridEnabled, draggedNodeId, isAutoLayout, customPipes
  ]);

  return (
    <div className={`w-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative shadow-lg`}>

      <div className={`p-3 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-10`}>
        <div>
          <h3 className={`text-sm font-bold text-slate-200 flex items-center gap-2`}>
            System Line Diagram
            {vrfResults.toxicLimitExceeded && (
              <span className={`bg-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full uppercase border border-rose-500/30`}>
                Safety Warning
              </span>
            )}
          </h3>
          <p className={`text-[10px] text-slate-500`}>Auto-generated sequential Y-branch layout.</p>
        </div>

        <div className={`flex flex-wrap items-center gap-3`}>
          <div className={`flex items-center gap-4 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800`}>
            <div className={`flex flex-col`}>
              <span className={`text-[9px] text-slate-500 font-bold uppercase`}>Max Path Length</span>
              <span className={`text-xs font-mono text-slate-300`}>{pressureDropStats.maxPathLen} m</span>
            </div>
            <div className={`w-px h-6 bg-slate-800`}></div>
            <div className={`flex flex-col`}>
              <span className={`text-[9px] text-slate-500 font-bold uppercase`}>Est. Total Pressure Drop</span>
              <span className={`text-xs font-mono text-sky-400`}>{(pressureDropStats.totalDrop || 0).toFixed(1)} kPa</span>
            </div>
          </div>




          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-lg text-[10px] font-bold uppercase gap-1">
            <button
              type="button"
              onClick={() => { setIsPanZoomMode(!isPanZoomMode); if(isDrawMode) setIsDrawMode(false); }}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                isPanZoomMode ? `bg-sky-600 text-white shadow-sm font-extrabold` : `text-slate-400 hover:text-white`
              }`}
              title={isPanZoomMode ? "Disable Pan/Zoom Mode" : "Enable Pan/Zoom Mode (Click & Drag)"}
            >
              <Hand className={`h-3.5 w-3.5`} />
              <span>Pan / Zoom</span>
            </button>
            <div className="w-px bg-slate-800 my-1 mx-1"></div>
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.1, z / 1.2))}
              className={`flex items-center space-x-1.5 rounded-md px-2 py-1.5 transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800`}
              title="Zoom Out"
            >
              <ZoomOut className={`h-3.5 w-3.5`} />
            </button>
            <button
              type="button"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className={`flex items-center space-x-1.5 rounded-md px-2 py-1.5 transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800`}
              title="Reset View"
            >
              <Maximize className={`h-3.5 w-3.5`} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(5, z * 1.2))}
              className={`flex items-center space-x-1.5 rounded-md px-2 py-1.5 transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800`}
              title="Zoom In"
            >
              <ZoomIn className={`h-3.5 w-3.5`} />
            </button>
          </div>

          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-lg text-[10px] font-bold uppercase gap-1">
            <button
              type="button"
              onClick={() => {
                 setIsAutoLayout(!isAutoLayout);
                 if (isAutoLayout) {
                   setIsDrawMode(true);
                   setIsPanZoomMode(false);
                   triggerToast('Switched to Custom Piping Mode');
                 } else {
                   setIsDrawMode(false);
                   setCustomPipes([]);
                   triggerToast('Switched to Auto Piping Mode');
                 }
              }}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                !isAutoLayout ? `bg-sky-600 text-white shadow-sm font-extrabold` : `text-slate-400 hover:text-white`
              }`}
              title={!isAutoLayout ? 'Switch to Auto Pipe Layout' : 'Enable Free Draw Pipe'}
            >
              <Play className={`h-3.5 w-3.5`} />
              <span>{!isAutoLayout ? 'Custom Pipe Mode' : 'Auto Pipe Layout'}</span>
            </button>
            
            {!isAutoLayout && (
              <button
                type="button"
                onClick={() => setCustomPipes([])}
                className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer bg-rose-950/30 hover:bg-rose-900/50 text-rose-400`}
                title="Clear Custom Pipes"
              >
                <Trash2 className={`h-3 w-3`} />
                <span>Clear Pipes</span>
              </button>
            )}
          </div>

          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-lg text-[10px] font-bold uppercase gap-1">
            <button
              type="button"
              onClick={() => setIsGridEnabled(!isGridEnabled)}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                isGridEnabled ? `bg-slate-800 text-white` : `text-slate-400 hover:text-white`
              }`}
              title={isGridEnabled ? 'Disable Grid Snap' : 'Enable Grid Snap'}
            >
              <Grid className={`h-3.5 w-3.5`} />
              <span>Grid</span>
            </button>
            <div className="w-px bg-slate-800 my-1 mx-1"></div>
            <button
              type="button"
              onClick={() => {
                const newId = `room-${Date.now()}`;
                setVrfRooms([
                  ...vrfRooms,
                  { id: newId, name: `FCU-${vrfRooms.length + 1}`, basis: 'area', size: 30, occupants: 2, tons: 1.5, watts: 5200, pipeLength: 15 }
                ]);
                triggerToast('New FCU Added to Schematic!');
              }}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer text-indigo-400 hover:text-white hover:bg-slate-800`}
              title="Add FCU (Indoor Unit)"
            >
              <Plus className={`h-3.5 w-3.5`} />
              <span>Add FCU</span>
            </button>
            <button
              type="button"
              onClick={handleOptimizeRouting}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer text-amber-400 hover:text-white hover:bg-slate-800`}
              title="Optimize Routing (Sort by Load & Align)"
            >
              <Zap className={`h-3.5 w-3.5`} />
              <span>Optimize</span>
            </button>
          </div>

          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-lg text-[10px] font-bold uppercase gap-1">
            <button
              type="button"
              onClick={handleExportBOM}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer text-emerald-400 hover:text-white hover:bg-slate-800`}
              title="Export BOM Schedule (CSV)"
            >
              <FileText className={`h-3.5 w-3.5`} />
              <span>BOM</span>
            </button>
            <button
              type="button"
              onClick={handleExportDxf}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer text-sky-400 hover:text-white hover:bg-slate-800`}
              title="Export CAD (DXF)"
            >
              <Download className={`h-3.5 w-3.5`} />
              <span>CAD</span>
            </button>
            <div className="w-px bg-slate-800 my-1 mx-1"></div>
            <button
              type="button"
              onClick={() => setIsFlowing(!isFlowing)}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800`}
              title={isFlowing ? 'Pause Refrigerant Flow' : 'Animate Refrigerant Flow'}
            >
              {isFlowing ? <Pause className={`w-3 h-3 text-sky-400`} /> : <Play className={`w-3 h-3 text-emerald-400`} />}
              <span>{isFlowing ? 'Flowing' : 'Paused'}</span>
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className={`w-full relative overflow-y-auto overflow-x-hidden bg-slate-950/50`}
        style={{ maxHeight: '600px' }}
      >
        <canvas key={JSON.stringify(vrfResults)}
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className={`block w-full h-full ${isDrawMode ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ touchAction: 'none' }}
        />

        {selectedNodeId === 'odu' && (
          <div className={`absolute left-3 top-3 bg-slate-900/95 border border-slate-800 rounded-xl p-4 max-w-xs w-64 shadow-2xl space-y-2.5 z-10 backdrop-blur-md text-[10px]`}>
            <div className={`flex justify-between items-center border-b border-slate-800 pb-1.5`}>
              <span className={`text-[10px] font-bold text-sky-400 uppercase flex items-center gap-1.5`}>
                <Info className={`h-3 w-3`} /> Outdoor Unit Profile
              </span>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className={`text-slate-500 hover:text-white text-xs`}
              >
                ✕
              </button>
            </div>
            <div className={`space-y-1 text-slate-300`}>
              <div className={`flex justify-between`}>
                <span>Total Connected IDUs:</span>
                <span className={`font-mono text-emerald-400 font-bold`}>{vrfRooms.length} Zones</span>
              </div>
              <div className={`flex justify-between`}>
                <span>Sum IDU Load:</span>
                <span className={`font-mono text-white`}>{(vrfResults.totalConnectedTons || 0).toFixed(2)} TR</span>
              </div>
              <div className={`flex justify-between`}>
                <span>Diversity factor:</span>
                <span className={`font-mono text-slate-400`}>{(diversityFactor || 0).toFixed(2)}x</span>
              </div>
              <div className={`flex justify-between border-t border-slate-800/60 pt-1`}>
                <span>Coincident Peak Load:</span>
                <span className={`font-mono text-white font-semibold`}>{(vrfResults.coincidentTons || 0).toFixed(2)} TR</span>
              </div>
              <div className={`flex justify-between`}>
                <span>ODU Size Selection:</span>
                <span className={`font-mono text-sky-400 font-semibold`}>{vrfResults.oduHP} HP ({(vrfResults.oduTons || 0).toFixed(1)} TR)</span>
              </div>
              <div className={`flex justify-between`}>
                <span>Combination Ratio:</span>
                <span className={`font-mono font-bold ${vrfResults.combinationRatio > maxAllowedCr ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                  {(vrfResults.combinationRatio || 0).toFixed(1)}%
                </span>
              </div>
              {/* Configure Main Trunk Line Length directly on ODU node */}
              <div className={`border-t border-slate-800/60 pt-1.5 space-y-1`}>
                <label className={`block text-[8px] font-bold text-slate-400 uppercase`}>Main Line Set Length (m)</label>
                <input
                  type="number"
                  min="1"
                  value={mainPipingLength}
                  onChange={(e) => setMainPipingLength(Math.max(1, Number(e.target.value)))}
                  className={`w-full bg-slate-950 text-white rounded-md px-2 py-1 text-xs border border-slate-800 focus:outline-none focus:border-emerald-500 font-mono invalid:border-red-500 invalid:text-red-400 focus:invalid:border-red-500 focus:invalid:ring-red-500`}
                />
              </div>
              {/* Refrigerant Charge Breakdown */}
              <div className={`border-t border-slate-800/60 pt-1.5 space-y-1 text-[9px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850`}>
                <span className={`font-bold uppercase text-slate-300 block mb-1`}>Charge calculation ({refrigerantType}):</span>
                <div className={`flex justify-between`}>
                  <span>Base pre-charge:</span>
                  <span className={`font-mono text-white`}>{(vrfResults.baseOduCharge || 0).toFixed(2)} kg</span>
                </div>
                <div className={`flex justify-between`}>
                  <span>Main line charge ({refrigerantType === 'R32' ? '50g/m' : '55g/m'}):</span>
                  <span className={`font-mono text-white`}>{((mainPipingLength * (refrigerantType === 'R32' ? 0.050 : 0.055)) || 0).toFixed(2)} kg</span>
                </div>
                <div className={`flex justify-between`}>
                  <span>Branch lines charge:</span>
                  <span className={`font-mono text-white`}>{((vrfRooms.reduce((sum, r) => sum + (r.pipeLength ?? 15), 0) * (refrigerantType === 'R32' ? 0.050 : 0.055)) || 0).toFixed(2)} kg</span>
                </div>
                <div className={`flex justify-between border-t border-slate-800/40 pt-1 font-bold text-emerald-400 text-[10px]`}>
                  <span>Total System Charge:</span>
                  <span className={`font-mono`}>{(vrfResults.totalCharge || 0).toFixed(2)} kg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {hoveredPipe && mousePos && (
          <div 
            className={`absolute z-20 bg-slate-900/95 border border-slate-700 shadow-xl rounded-lg p-3 text-xs pointer-events-none backdrop-blur-md`}
            style={{ 
              left: Math.min(mousePos.x + 15, dimensions.width - 200), 
              top: Math.min(mousePos.y + 15, dimensions.height - 100) 
            }}
          >
            <div className={`font-bold text-sky-400 mb-1 border-b border-slate-700 pb-1`}>
              {hoveredPipe.name}
            </div>
            <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300`}>
              <span className={`text-slate-500`}>Length:</span>
              <span className={`text-right font-mono`}>{hoveredPipe.length} {typeof hoveredPipe.length === 'number' ? 'm' : ''}</span>
              
              <span className={`text-slate-500`}>Downstream Load:</span>
              <span className={`text-right font-mono`}>{(hoveredPipe.downstreamTons || 0).toFixed(2)} TR</span>
              
              <span className={`text-slate-500`}>Liquid Line (OD):</span>
              <span className={`text-right font-mono text-sky-400`}>{getPipeSizes(hoveredPipe.downstreamTons).liquid}</span>
              
              <span className={`text-slate-500`}>Suction Gas (OD):</span>
              <span className={`text-right font-mono text-orange-400`}>{getPipeSizes(hoveredPipe.downstreamTons).gas}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Visual legend details */}

      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] text-slate-400 border-t border-slate-800/40 p-3 bg-slate-900`}>
        <div className={`flex items-center gap-1.5`}>
          <div className={`w-3 h-1.5 bg-sky-500 rounded-sm`} />
          <span>Liquid Line (Circulating R-{refrigerantType === 'R32' ? '32' : '410A'})</span>
        </div>
        <div className={`flex items-center gap-1.5`}>
          <div className={`w-3 h-1.5 bg-orange-500 rounded-sm`} />
          <span>Suction Gas Line (Gas Return)</span>
        </div>
        <div className={`flex items-center gap-1.5`}>
          <div className={`w-2.5 h-2.5 bg-slate-900 border border-emerald-500 rounded-full`} />
          <span>Sized Indoor Unit (IDU Node)</span>
        </div>
        <div className={`flex items-center gap-1.5`}>
          <div className={`w-2.5 h-2.5 bg-slate-600 border border-slate-400 rounded-full flex items-center justify-center text-[7px] font-bold text-white font-mono`}>Y</div>
          <span>Refnet Y-Branch</span>
        </div>
      </div>
    </div>
  );
}
