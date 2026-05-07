import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Eye, Save, Loader2 } from 'lucide-react';
import type { CanvasPath } from '@/services/lensAnnotationService';

type Tool = 'pencil' | 'eraser';
type VisionZone = 'far' | 'intermediate' | 'near';

interface Props {
  initialImage: string | null;
  initialPaths: CanvasPath[] | null;
  onSave: (imageData: string, paths: CanvasPath[]) => Promise<void>;
  isSaving: boolean;
}

const CANVAS_WIDTH = 732;
const CANVAS_HEIGHT = 600;
const DOT_SPACING = 20;

const ZONE_COLORS: Record<VisionZone, string> = {
  far: 'rgba(59, 130, 246, 0.08)',
  intermediate: 'rgba(16, 185, 129, 0.08)',
  near: 'rgba(245, 158, 11, 0.08)',
};

const ZONE_LABELS: Record<VisionZone, string> = {
  far: 'Lejos',
  intermediate: 'Inter.',
  near: 'Cerca',
};

const ZONE_BOUNDS: Record<VisionZone, { y: number; h: number; label: string; desc: string }> = {
  far: { y: 0, h: 180, label: 'Visión lejana', desc: 'Zona superior · nitidez a +2 m' },
  intermediate: { y: 180, h: 200, label: 'Visión intermedia', desc: 'Zona central · pantallas a 50–80 cm' },
  near: { y: 380, h: 220, label: 'Visión cercana', desc: 'Zona inferior · lectura a 30–40 cm' },
};

const LENS_TYPES = [
  { value: 'progresivo', label: 'Progresivo', description: 'Lente que combina múltiples graduaciones en un solo cristal, permitiendo ver de lejos, intermedio y cerca sin líneas visibles.', details: 'La zona superior está optimizada para visión lejana y la inferior para visión cercana.' },
  { value: 'bifocal', label: 'Bifocal', description: 'Lente con dos zonas de visión diferenciadas por una línea visible. La parte superior para visión lejana y la inferior para visión cercana.', details: 'Transición abrupta entre las dos graduaciones con una línea divisoria visible.' },
  { value: 'monofocal', label: 'Monofocal', description: 'Lente con una sola graduación en toda su superficie. Corrige un solo tipo de problema visual.', details: 'Toda la superficie del lente tiene la misma graduación.' },
  { value: 'ocupacional', label: 'Ocupacional', description: 'Lente diseñado para distancias intermedias y cercanas, ideal para trabajo de oficina y lectura.', details: 'Optimizado para distancias de trabajo de 40 cm a 2 m.' },
];

function drawDotGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#d4d4d8';
  for (let x = DOT_SPACING; x < w; x += DOT_SPACING) {
    for (let y = DOT_SPACING; y < h; y += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGlassesTemplate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2 - 20;

  ctx.save();
  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  const lensW = 140;
  const lensH = 110;
  const bridge = 18;
  const templeLen = 60;

  const leftX = cx - lensW - bridge / 2;
  const rightX = cx + bridge / 2;

  ctx.beginPath();
  ctx.roundRect(leftX, cy - lensH / 2, lensW, lensH, 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(rightX, cy - lensH / 2, lensW, lensH, 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftX + lensW, cy);
  ctx.lineTo(rightX, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftX, cy);
  ctx.lineTo(leftX - templeLen, cy - 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightX + lensW, cy);
  ctx.lineTo(rightX + lensW + templeLen, cy - 10);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = '#71717a';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OD', leftX + lensW / 2, cy);
  ctx.fillText('OI', rightX + lensW / 2, cy);

  ctx.restore();
}

function drawZoneOverlays(ctx: CanvasRenderingContext2D, w: number, h: number, activeZones: Set<VisionZone>) {
  const zoneOrder: VisionZone[] = ['far', 'intermediate', 'near'];
  for (const zone of zoneOrder) {
    if (!activeZones.has(zone)) continue;
    const { y: zoneY, h: zoneH, label } = ZONE_BOUNDS[zone];

    ctx.fillStyle = ZONE_COLORS[zone];
    ctx.fillRect(0, zoneY, w, zoneH);

    ctx.strokeStyle = ZONE_COLORS[zone].replace('0.08', '0.3');
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(0, zoneY, w, zoneH);
    ctx.setLineDash([]);

    ctx.fillStyle = ZONE_COLORS[zone].replace('0.08', '0.5');
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, zoneY + 16);
  }
}

function redrawCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  paths: CanvasPath[],
  activeZones: Set<VisionZone>,
  backgroundImage: HTMLImageElement | null,
) {
  ctx.clearRect(0, 0, w, h);

  drawDotGrid(ctx, w, h);
  drawGlassesTemplate(ctx, w, h);
  drawZoneOverlays(ctx, w, h, activeZones);

  if (backgroundImage) {
    ctx.globalAlpha = 0.15;
    ctx.drawImage(backgroundImage, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  for (const path of paths) {
    if (path.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = path.type === 'eraser' ? '#ffffff' : path.color;
    ctx.lineWidth = path.type === 'eraser' ? 20 : path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = path.type === 'eraser' ? 'destination-out' : 'source-over';

    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
  }
}

export function LensCanvas({ initialImage, initialPaths, onSave, isSaving }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [activeZones, setActiveZones] = useState<Set<VisionZone>>(new Set());
  const [paths, setPaths] = useState<CanvasPath[]>(initialPaths ?? []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedLens, setSelectedLens] = useState(LENS_TYPES[0].value);
  const currentPath = useRef<CanvasPath | null>(null);
  const backgroundImage = useRef<HTMLImageElement | null>(null);
  const pathsRef = useRef<CanvasPath[]>(paths);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    if (initialPaths) {
      setPaths(initialPaths);
    }
  }, [initialPaths]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    redrawCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, pathsRef.current, activeZones, backgroundImage.current);
  }, [activeZones]);

  useEffect(() => {
    if (!initialImage) {
      backgroundImage.current = null;
      renderCanvas();
      return;
    }
    const img = new Image();
    img.onload = () => {
      backgroundImage.current = img;
      renderCanvas();
    };
    img.onerror = () => {
      backgroundImage.current = null;
      renderCanvas();
    };
    img.src = initialImage;
  }, [initialImage, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [paths, activeZones, renderCanvas]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    currentPath.current = {
      type: tool,
      color: tool === 'pencil' ? '#1e1e2e' : '#ffffff',
      size: tool === 'pencil' ? 2.5 : 20,
      points: [{ x, y }],
    };
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !currentPath.current) return;
    const { x, y } = getCanvasCoords(e);
    currentPath.current.points.push({ x, y });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    redrawCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, [...pathsRef.current, currentPath.current], activeZones, backgroundImage.current);
  };

  const stopDrawing = () => {
    if (!currentPath.current) return;
    setPaths(prev => [...prev, currentPath.current!]);
    currentPath.current = null;
    setIsDrawing(false);
  };

  const toggleZone = (zone: VisionZone) => {
    setActiveZones(prev => {
      const next = new Set(prev);
      if (next.has(zone)) {
        next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  };

  const clearCanvas = () => {
    setPaths([]);
    currentPath.current = null;
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = CANVAS_WIDTH;
    saveCanvas.height = CANVAS_HEIGHT;
    const saveCtx = saveCanvas.getContext('2d');
    if (!saveCtx) return;

    saveCtx.fillStyle = '#ffffff';
    saveCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawDotGrid(saveCtx, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawGlassesTemplate(saveCtx, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawZoneOverlays(saveCtx, CANVAS_WIDTH, CANVAS_HEIGHT, activeZones);

    const currentPaths = [...paths];
    if (currentPath.current) {
      currentPaths.push(currentPath.current);
    }

    for (const path of currentPaths) {
      if (path.points.length < 2) continue;
      saveCtx.beginPath();
      saveCtx.strokeStyle = path.type === 'eraser' ? '#ffffff' : path.color;
      saveCtx.lineWidth = path.type === 'eraser' ? 20 : path.size;
      saveCtx.lineCap = 'round';
      saveCtx.lineJoin = 'round';
      saveCtx.globalCompositeOperation = path.type === 'eraser' ? 'destination-out' : 'source-over';

      saveCtx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        saveCtx.lineTo(path.points[i].x, path.points[i].y);
      }
      saveCtx.stroke();
      saveCtx.globalCompositeOperation = 'source-over';
    }

    const imageData = saveCanvas.toDataURL('image/png');
    await onSave(imageData, currentPaths);
  };

  const selectedLensInfo = LENS_TYPES.find(l => l.value === selectedLens) ?? LENS_TYPES[0];

  return (
    <div className="flex-1 overflow-hidden flex">
      <div className="w-[380px] shrink-0 border-r border-[#e5e5e9] bg-white overflow-y-auto">
        <div className="px-5 pt-5 pb-4 border-b border-[#e5e5e9]">
          <p className="text-[15px] font-semibold text-[#0f0f12]">Información del Lente</p>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-[12px] font-semibold text-[#7d7d87] uppercase tracking-[0.6px]">Tipo de lente formulado</label>
            <select
              value={selectedLens}
              onChange={e => setSelectedLens(e.target.value)}
              className="mt-2 w-full h-10 px-3 border border-[#e0e0e5] rounded-[6px] text-[14px] text-[#121215] bg-white focus:outline-none focus:border-[#0f8f64] appearance-none"
            >
              {LENS_TYPES.map(lt => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[#7d7d87] uppercase tracking-[0.6px] mb-2">Descripción</p>
            <p className="text-[13px] text-[#121215] leading-relaxed">{selectedLensInfo.description}</p>
            <p className="text-[13px] text-[#121215] leading-relaxed mt-2">{selectedLensInfo.details}</p>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[#7d7d87] uppercase tracking-[0.6px] mb-3">Zonas de visión</p>
            <div className="space-y-2">
              {(['far', 'intermediate', 'near'] as VisionZone[]).map(zone => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => toggleZone(zone)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-[6px] text-left transition-colors ${
                    activeZones.has(zone) ? 'bg-[#e5f6ef]' : 'bg-[#fafafb] hover:bg-[#f5f5f6]'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      zone === 'far' ? 'bg-[#3b82f6]' : zone === 'intermediate' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'
                    }`}
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-[#0f0f12]">{ZONE_BOUNDS[zone].label}</p>
                    <p className="text-[11px] text-[#7d7d87]">{ZONE_BOUNDS[zone].desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#f5f5f6] min-w-0">
        <div className="h-[52px] bg-white border-b border-[#e5e5e9] flex items-center px-5 gap-2 shrink-0">
          <Eye className="w-4 h-4 text-[#7d7d87]" />
          <span className="text-[14px] font-semibold text-[#0f0f12]">Simulador de Visión</span>

          <div className="w-px h-5 bg-[#e0e0e5] mx-2" />

          <button
            type="button"
            onClick={() => setTool('pencil')}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${
              tool === 'pencil' ? 'bg-[#0f8f64] text-white' : 'text-[#7d7d87] hover:text-[#121215] hover:bg-[#f0f0f2]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            Lápiz
          </button>

          <div className="w-px h-5 bg-[#e0e0e5]" />

          {(['far', 'intermediate', 'near'] as VisionZone[]).map(zone => (
            <button
              key={zone}
              type="button"
              onClick={() => toggleZone(zone)}
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                activeZones.has(zone)
                  ? 'bg-[#0f8f64] text-white'
                  : 'text-[#7d7d87] hover:text-[#121215] hover:bg-[#f0f0f2]'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  zone === 'far' ? 'bg-current' : zone === 'intermediate' ? 'bg-current' : 'bg-current'
                }`}
              />
              {ZONE_LABELS[zone]}
            </button>
          ))}

          <div className="w-px h-5 bg-[#e0e0e5]" />

          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors ${
              tool === 'eraser' ? 'bg-[#0f8f64] text-white' : 'text-[#7d7d87] hover:text-[#121215] hover:bg-[#f0f0f2]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Borrar
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium text-[#b82626] hover:bg-[#ffeeed] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar todo
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 h-8 px-4 bg-[#0f8f64] text-white rounded-[6px] text-[12px] font-semibold hover:bg-[#0a7050] disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-5">
          <div className="bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden shadow-sm">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block cursor-crosshair"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="h-[40px] bg-white border-t border-[#e5e5e9] flex items-center px-5 shrink-0">
          <p className="text-[11px] text-[#7d7d87]">
            Dibuje sobre los lentes para explicar las zonas de visión al paciente
          </p>
        </div>
      </div>
    </div>
  );
}
