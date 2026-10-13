import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Pencil, Eraser, RotateCcw, Trash2, X, Check } from 'lucide-react';

export interface ChalkCanvasRef {
  clear: () => void;
  undo: () => void;
}

interface ChalkCanvasProps {
  isActive: boolean;
  onToggleActive: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  size: number;
  isEraser: boolean;
}

export const ChalkCanvas = forwardRef<ChalkCanvasRef, ChalkCanvasProps>(({ isActive, onToggleActive }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState<string>('#ffffff'); // White chalk default
  const [currentSize, setCurrentSize] = useState<number>(5);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Resize canvas to match container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawAll(strokes);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [strokes]);

  // Redraw canvas
  const redrawAll = (allStrokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size * 3;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        // Chalk effect shadow
        ctx.shadowBlur = 1;
        ctx.shadowColor = stroke.color;
      }

      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      setStrokes([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    undo: () => {
      setStrokes((prev) => {
        const updated = prev.slice(0, -1);
        redrawAll(updated);
        return updated;
      });
    },
  }));

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;

    setIsDrawing(true);
    const newStroke: Stroke = {
      points: [pos],
      color: currentColor,
      size: currentSize,
      isEraser,
    };
    setCurrentStroke(newStroke);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke || !isActive) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, pos],
    };

    setCurrentStroke(updatedStroke);
    redrawAll([...strokes, updatedStroke]);
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    if (currentStroke.points.length > 1) {
      const updated = [...strokes, currentStroke];
      setStrokes(updated);
    }
    setCurrentStroke(null);
  };

  const handleClear = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleUndo = () => {
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    redrawAll(updated);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      
      {/* HTML5 Canvas overlay */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`w-full h-full ${
          isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
      />

      {/* Floating Chalk Toolbar: ONLY shown when isActive is true, positioned cleanly at the bottom tray */}
      {isActive && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto z-30 bg-slate-950/95 backdrop-blur-md border-2 border-slate-700/80 rounded-2xl px-4 py-2 text-white shadow-2xl flex items-center gap-3 flex-wrap">
          
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
            <Pencil className="w-4 h-4 animate-pulse" />
            <span>분필 판서 중</span>
          </div>

          <span className="w-[1px] h-5 bg-slate-700" />

          {/* Chalk Colors */}
          <div className="flex items-center gap-1.5">
            {[
              { color: '#ffffff', label: '흰색' },
              { color: '#facc15', label: '노랑' },
              { color: '#ef4444', label: '빨강' },
              { color: '#22c55e', label: '초록' },
              { color: '#06b6d4', label: '파랑' },
            ].map((c) => (
              <button
                key={c.color}
                onClick={() => {
                  setCurrentColor(c.color);
                  setIsEraser(false);
                }}
                className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                  !isEraser && currentColor === c.color ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={`${c.label} 분필`}
              />
            ))}
          </div>

          <span className="w-[1px] h-5 bg-slate-700" />

          {/* Brush Thickness */}
          <div className="flex items-center gap-1">
            {[
              { size: 3, label: '얇게' },
              { size: 6, label: '보통' },
              { size: 12, label: '두껍게' },
            ].map((s) => (
              <button
                key={s.size}
                onClick={() => setCurrentSize(s.size)}
                className={`px-2 py-1 text-[11px] font-extrabold rounded-lg transition cursor-pointer ${
                  currentSize === s.size ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="w-[1px] h-5 bg-slate-700" />

          {/* Eraser */}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              isEraser ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="지우개"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>지우개</span>
          </button>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition cursor-pointer"
            title="되돌리기"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Clear All */}
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 disabled:opacity-40 text-rose-300 transition cursor-pointer"
            title="전체 판서 지우기"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-5 bg-slate-700" />

          {/* Finish / Close Drawing */}
          <button
            onClick={onToggleActive}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer shadow-md"
            title="판서 종료"
          >
            <Check className="w-3.5 h-3.5" />
            <span>판서 완료</span>
          </button>

        </div>
      )}
    </div>
  );
});

ChalkCanvas.displayName = 'ChalkCanvas';
