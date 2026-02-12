import React, { useRef, useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiRotateCcw, FiX, FiCheck } from 'react-icons/fi';
import './ScribbleOverlay.css'; // We'll need to create this or add to index.css

const ScribbleOverlay = ({ fileId, drawings = [], onAddDrawing, onUndo, onClear, isActive, tool, color, penSize = 3, eraserSize = 15, editor }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [lineRange, setLineRange] = useState({ min: Infinity, max: -Infinity });
    const [context, setContext] = useState(null);

    const lineWidth = tool === 'eraser' ? eraserSize : penSize;

    // Initialize canvas context
    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            setContext(ctx);
        }
    }, []);

    // Listen to editor scroll to redraw
    useEffect(() => {
        if (!editor) return;
        const disposable = editor.onDidScrollChange(() => {
            redraw();
        });
        return () => disposable.dispose();
    }, [editor, drawings, context]);

    // Resize canvas to match parent
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.offsetWidth;
                canvasRef.current.height = canvasRef.current.parentElement.offsetHeight;
                redraw();
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [drawings, context]);

    const getScreenY = (line, relY) => {
        if (!editor) return relY;
        // getTopForLineNumber returns pixels from top of model
        const top = editor.getTopForLineNumber(line);
        const scrollTop = editor.getScrollTop();
        return (top + relY) - scrollTop + 16; // +16 for editor padding top
    };

    const redraw = () => {
        if (!canvasRef.current || !context || !editor) return;

        const ctx = context;
        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw saved drawings
        drawings.forEach(drawing => {
            renderPath(drawing.points, drawing.initialLine, drawing.minLine, drawing.maxLine, drawing.tool, drawing.color, drawing.width);
        });

        // Draw current active path
        if (isDrawing && currentPath.length > 1) {
            const initialLine = currentPath[0].line;
            renderPath(currentPath, initialLine, lineRange.min, lineRange.max, tool, color, lineWidth);
        }

        ctx.globalCompositeOperation = 'source-over';
    };

    const renderPath = (points, initialLine, minL, maxL, pTool, pColor, pWidth) => {
        if (points.length < 2 || !context || !editor) return;
        const ctx = context;
        const canvas = canvasRef.current;

        // Clip to line range
        const topBoundary = editor.getTopForLineNumber(minL);
        const bottomBoundary = editor.getTopForLineNumber(maxL + 1);
        const scrollTop = editor.getScrollTop();

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, topBoundary - scrollTop + 16, canvas.width, bottomBoundary - topBoundary);
        ctx.clip();

        ctx.beginPath();
        ctx.strokeStyle = pTool === 'eraser' ? 'rgba(0,0,0,1)' : pColor;
        ctx.lineWidth = pWidth;
        ctx.globalCompositeOperation = pTool === 'eraser' ? 'destination-out' : 'source-over';

        const firstPoint = points[0];
        ctx.moveTo(firstPoint.x, getScreenY(initialLine, firstPoint.relY));

        points.slice(1).forEach(point => {
            ctx.lineTo(point.x, getScreenY(initialLine, point.relY));
        });
        ctx.stroke();
        ctx.restore();
    };

    useEffect(() => {
        redraw();
    }, [drawings, context, editor]);

    const getCoordinates = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        if (!editor) return;
        const { x, y } = getCoordinates(e);

        // Find which line we are on
        const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
        const line = target?.position?.lineNumber || 1;
        const lineTop = editor.getTopForLineNumber(line);
        const scrollTop = editor.getScrollTop();

        // Calculate relY: (y + scrollTop - 16) - lineTop
        const relY = (y + scrollTop - 16) - lineTop;

        setIsDrawing(true);
        setCurrentPath([{ x, relY, line }]);
        setLineRange({ min: line, max: line });
    };

    const draw = (e) => {
        if (!isDrawing || !context || !editor) return;
        const { x, y } = getCoordinates(e);

        const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
        const currentLine = target?.position?.lineNumber || currentPath[0].line;

        const initialPoint = currentPath[0];
        const lineTop = editor.getTopForLineNumber(initialPoint.line);
        const scrollTop = editor.getScrollTop();
        const relY = (y + scrollTop - 16) - lineTop;

        setCurrentPath(prev => [...prev, { x, relY, line: initialPoint.line }]);
        setLineRange(prev => ({
            min: Math.min(prev.min, currentLine),
            max: Math.max(prev.max, currentLine)
        }));

        // We don't manually draw here anymore, redraw() handles it via state update
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentPath.length > 1) {
            onAddDrawing(fileId, {
                id: Date.now().toString(),
                points: currentPath,
                initialLine: currentPath[0].line,
                minLine: lineRange.min,
                maxLine: lineRange.max,
                color: color,
                width: lineWidth,
                tool: tool
            });
        }
        setCurrentPath([]);
        setLineRange({ min: Infinity, max: -Infinity });
    };

    return (
        <div className="scribble-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isActive ? 'auto' : 'none',
            zIndex: 100
        }}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                    cursor: tool === 'eraser' ? 'cell' : 'crosshair',
                    display: 'block',
                    touchAction: 'none'
                }}
            />
        </div>
    );
};

export default ScribbleOverlay;
