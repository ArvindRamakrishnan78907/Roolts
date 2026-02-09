import React, { useRef, useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiRotateCcw, FiX, FiCheck } from 'react-icons/fi';
import './ScribbleOverlay.css'; // We'll need to create this or add to index.css

const ScribbleOverlay = ({ fileId, drawings = [], onAddDrawing, onUndo, onClear, isActive, tool, color, penSize = 3, eraserSize = 15 }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
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
        handleResize(); // Initial resize

        return () => window.removeEventListener('resize', handleResize);
    }, [drawings]); // Redraw on resize

    // Redraw whenever drawings change or resize happens
    const redraw = () => {
        if (!canvasRef.current || !context) return;

        const ctx = context;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw existing paths
        drawings.forEach(drawing => {
            if (drawing.points.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = drawing.tool === 'eraser' ? 'rgba(0,0,0,1)' : drawing.color;
            ctx.lineWidth = drawing.width;
            ctx.globalCompositeOperation = drawing.tool === 'eraser' ? 'destination-out' : 'source-over';

            ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
            drawing.points.slice(1).forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    };

    useEffect(() => {
        redraw();
    }, [drawings, context]);

    const getCoordinates = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        const { x, y } = getCoordinates(e);
        setIsDrawing(true);
        setCurrentPath([{ x, y }]);
    };

    const draw = (e) => {
        if (!isDrawing || !context) return;
        const { x, y } = getCoordinates(e);

        setCurrentPath(prev => [...prev, { x, y }]);

        // Direct draw for responsiveness
        context.beginPath();
        context.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
        context.lineWidth = lineWidth;
        context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

        const lastPoint = currentPath[currentPath.length - 1];
        if (lastPoint) {
            context.moveTo(lastPoint.x, lastPoint.y);
            context.lineTo(x, y);
            context.stroke();
        }

        context.globalCompositeOperation = 'source-over';
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentPath.length > 1) {
            onAddDrawing(fileId, {
                id: Date.now().toString(),
                points: currentPath,
                color: color,
                width: lineWidth,
                tool: tool
            });
        }
        setCurrentPath([]);
    };

    return (
        <div className="scribble-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isActive ? 'auto' : 'none', // Capture events only when active
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
                    display: 'block', // Always visible
                    touchAction: 'none'
                }}
            />

            {/* Floating Toolbar REMOVED - Controlled by App.jsx/EditorTabs */}
        </div>
    );
};

export default ScribbleOverlay;
