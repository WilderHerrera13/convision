import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eraser, Pen, RotateCcw, Download, Palette, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define DrawingPath once and export it
export interface DrawingPath {
  points: Point[];
  color: string;
  lineWidth: number;
  tool: 'pen' | 'eraser';
}

interface DrawableCanvasProps {
  imageUrl: string;
  onSaveAnnotation?: (pathsJson: string, previewDataUrl: string) => void;
  className?: string;
  width?: number;
  height?: number;
  initialPaths?: DrawingPath[];
}

interface Point {
  x: number;
  y: number;
}

const DrawableCanvas: React.FC<DrawableCanvasProps> = ({
  imageUrl,
  onSaveAnnotation,
  className,
  width = 800,
  height = 600,
  initialPaths
}) => {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isCursorVisible, setIsCursorVisible] = useState(false);

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#000000', '#ffffff', '#808080', '#800000', '#008000', '#000080'
  ];

  // Define min/max for the slider
  const minLineWidth = 1;
  const maxLineWidth = 50; // Increased max for more range with slider

  // Effect to load and draw the background image onto the bgCanvas
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const bgCanvas = bgCanvasRef.current;
      const bgCtx = bgCanvas?.getContext('2d');
      if (!bgCanvas || !bgCtx) return;

      // Set canvases to image dimensions or specified dimensions
      const displayWidth = width;
      const displayHeight = height;
      
      bgCanvas.width = displayWidth;
      bgCanvas.height = displayHeight;
      // drawingCanvasRef dimensions are now set in a separate useEffect
      // if(drawingCanvasRef.current) { 
      //   drawingCanvasRef.current.width = displayWidth;
      //   drawingCanvasRef.current.height = displayHeight;
      // }

      // Calculate scale to fit image within canvas dimensions while maintaining aspect ratio
      const scale = Math.min(displayWidth / image.naturalWidth, displayHeight / image.naturalHeight);
      const scaledWidth = image.naturalWidth * scale;
      const scaledHeight = image.naturalHeight * scale;
      const offsetX = (displayWidth - scaledWidth) / 2;
      const offsetY = (displayHeight - scaledHeight) / 2;
      
      bgCtx.clearRect(0, 0, displayWidth, displayHeight); // Clear bg canvas
      bgCtx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight); // Draw image on bg canvas
      
      imageRef.current = image; // Store image ref if needed elsewhere, though primarily used for dimensions here
      setImageLoaded(true); // Signal that the background is ready
    };
    image.onerror = () => {
        console.error("Error loading background image for canvas.");
    }
    image.src = imageUrl;
  }, [imageUrl, width, height]);

  // Effect to set drawing canvas dimensions - NEW
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      canvas.width = width; // Use props directly
      canvas.height = height;
      // If paths already exist (e.g. from initialPaths or previous state),
      // and the canvas was just resized, we might need to redraw them.
      // The existing useEffect for paths changes will handle this if imageLoaded is also true.
      // For now, ensuring dimensions are set for live drawing is key.
      if (paths.length > 0 || (initialPaths && initialPaths.length > 0)) {
        redrawDrawingCanvas(); // Redraw if canvas resized and paths exist
      }
    }
  }, [width, height, paths, initialPaths]); // Add paths & initialPaths to re-evaluate if canvas resizes with content

  // Effect to load initial paths if provided
  useEffect(() => {
    if (initialPaths && imageLoaded) { // Ensure image is loaded so canvas dimensions are set
      setPaths(initialPaths);
    }
    // Only run if initialPaths changes; imageLoaded dependency ensures canvas is ready
  }, [initialPaths, imageLoaded]);

  // Effect to redraw the drawing canvas when paths or image (for initial load) changes
  useEffect(() => {
    // Only redraw completed paths if image (which sets up bgCanvas dimensions) is loaded,
    // and drawingCanvas also has its dimensions set (implicitly by width/height props change from other effect)
    // This prevents trying to draw on a 0x0 canvas before dimensions are established.
    if (imageLoaded && drawingCanvasRef.current && drawingCanvasRef.current.width > 0 && drawingCanvasRef.current.height > 0) {
      redrawDrawingCanvas();
    }
    // We depend on imageLoaded because bgCanvas (part of visual composite) relies on it.
    // Paths changes should trigger redraw on the correctly sized drawingCanvas.
  }, [paths, imageLoaded, width, height]); // Added width/height to ensure redraw if canvas resizes


  const redrawDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear only the drawing canvas

    paths.forEach(path => {
      if (path.points.length < 2) return;

      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = path.tool === 'eraser' ? 'rgba(0,0,0,1)' : path.color; // Eraser uses transparency
      ctx.lineWidth = path.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
  }, [paths]);


  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = drawingCanvasRef.current; 
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Don't scale here for cursor preview, as it's positioned relative to the bounding rect
    // const scaleX = canvas.width / rect.width; 
    // const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    // For actual drawing points, scale is needed
    const drawingPointX = (clientX - rect.left) * (canvas.width / rect.width);
    const drawingPointY = (clientY - rect.top) * (canvas.height / rect.height);

    // For cursor preview, use unscaled coordinates relative to the canvas element origin
    // This needs to be relative to the parent container if canvases are not at 0,0 of parent.
    // Let's adjust this logic if positioning is off, for now, assume it tracks mouse correctly for the preview div
    return { x: drawingPointX, y: drawingPointY }; 
  };

  const getRelativeCursorPosition = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    setCurrentPath([point]);
    
    // Draw initial point for immediate feedback
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = lineWidth;

      if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = currentColor;
      } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      }

      // Draw a small circle for the initial point
      ctx.beginPath();
      ctx.arc(point.x, point.y, lineWidth / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const point = getCanvasPoint(e);
    
    // Update the current path state
    setCurrentPath(prev => {
      const updatedPath = [...prev, point];
      
      // Draw immediately on canvas for real-time feedback
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && updatedPath.length >= 2) {
        const prevPoint = updatedPath[updatedPath.length - 2];

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineWidth;

        if (currentTool === 'pen') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = currentColor;
        } else if (currentTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        }

        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      
      return updatedPath;
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      draw(e);
    }
    setCursorPosition(getRelativeCursorPosition(e));
  };

  const handleMouseEnter = () => {
    setIsCursorVisible(true);
  };

  const handleMouseLeave = () => {
    setIsCursorVisible(false);
    if (isDrawing) {
        stopDrawing(); 
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, {
        points: currentPath,
        color: currentColor, // Stored, though eraser won't use it for color
        lineWidth: lineWidth,
        tool: currentTool
      }]);
    }
    setCurrentPath([]); // Clear current path after adding to paths
  };

  const clearCanvas = () => {
    setPaths([]); // This will trigger redrawDrawingCanvas to clear the drawing layer
  };

  const saveCanvas = () => {
    const finalCanvas = document.createElement('canvas');
    const bgC = bgCanvasRef.current;
    const drawingC = drawingCanvasRef.current;

    if (!bgC || !drawingC || !onSaveAnnotation) return;

    finalCanvas.width = bgC.width;
    finalCanvas.height = bgC.height;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    finalCtx.drawImage(bgC, 0, 0); // Draw background
    finalCtx.drawImage(drawingC, 0, 0); // Draw annotations on top

    const dataUrl = finalCanvas.toDataURL('image/png');
    const pathsJson = JSON.stringify(paths);
    onSaveAnnotation(pathsJson, dataUrl);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Compact Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        {/* Left: Tools */}
        <div className="flex items-center space-x-2">
          <Button
            variant={currentTool === 'pen' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool('pen')}
            className={cn(
              "h-9 px-3 rounded-lg transition-all",
              currentTool === 'pen' 
                ? "bg-blue-600 text-white shadow-sm" 
                : "hover:bg-gray-100"
            )}
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'eraser' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool('eraser')}
            className={cn(
              "h-9 px-3 rounded-lg transition-all",
              currentTool === 'eraser' 
                ? "bg-blue-600 text-white shadow-sm" 
                : "hover:bg-gray-100"
            )}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Colors */}
        <div className="flex items-center space-x-1.5">
          {colors.map(color => (
            <button
              key={color}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all hover:scale-105",
                currentColor === color 
                  ? "border-gray-700 ring-2 ring-blue-200 scale-105" 
                  : "border-gray-300 hover:border-gray-400"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentColor(color)}
            />
          ))}
        </div>

        {/* Right: Thickness & Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLineWidth(prev => Math.max(minLineWidth, prev - 1))} 
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min={minLineWidth}
                max={maxLineWidth}
                step="1"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value, 10))}
                className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700 w-6 text-center">{lineWidth}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLineWidth(prev => Math.min(maxLineWidth, prev + 1))} 
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCanvas} 
              className="h-9 px-3 hover:bg-gray-100 text-gray-600"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Limpiar
            </Button>
            {onSaveAnnotation && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={saveCanvas} 
                className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Guardar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 flex justify-center items-center bg-gray-50 p-6">
        <div 
          className="relative rounded-lg shadow-lg overflow-hidden" 
          style={{ 
            width: `${width}px`, 
            height: `${height}px`, 
            maxWidth: '100%', 
            maxHeight: '100%',
            background: `
              radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.03) 0%, transparent 50%),
              linear-gradient(135deg, #fefefe 0%, #f8f9fa 100%)
            `,
            boxShadow: `
              0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `
          }}
        >
          {/* Paper texture overlay */}
          <div 
            className="absolute inset-0 opacity-[0.015] pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
                radial-gradient(circle at 3px 7px, rgba(0,0,0,0.1) 0.5px, transparent 0),
                radial-gradient(circle at 7px 3px, rgba(0,0,0,0.1) 0.5px, transparent 0),
                radial-gradient(circle at 11px 11px, rgba(0,0,0,0.05) 0.5px, transparent 0)
              `,
              backgroundSize: '12px 12px, 8px 8px, 8px 8px, 16px 16px',
              zIndex: 0
            }}
          />
          
          <canvas
            ref={bgCanvasRef}
            className="absolute top-0 left-0"
            style={{ zIndex: 1, maxWidth: '100%', height: 'auto' }}
          />
          <canvas
            ref={drawingCanvasRef}
            className="absolute top-0 left-0 touch-none"
            style={{
              zIndex: 2,
              maxWidth: '100%',
              height: 'auto',
              cursor: isCursorVisible ? 'none' : 'crosshair',
            }}
            onMouseDown={startDrawing}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {isCursorVisible && cursorPosition && (currentTool === 'pen' || currentTool === 'eraser') && (
            <div
              className="absolute rounded-full border border-gray-400 bg-gray-400 bg-opacity-30"
              style={{
                left: `${cursorPosition.x - lineWidth / 2}px`,
                top: `${cursorPosition.y - lineWidth / 2}px`,
                width: `${lineWidth}px`,
                height: `${lineWidth}px`,
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawableCanvas; 