import { useRef, useEffect, useState } from 'react';
import type ToolSystem from '../tools/ToolSystem';

interface CanvasProps {
    draw: (ctx: CanvasRenderingContext2D) => void;
    backgroundColor: string;
    toolSystem: ToolSystem;
    viewport: {x: number, y: number, scale: number};
};

const Canvas: React.FC<CanvasProps> = (props) => {
    const { draw, backgroundColor, toolSystem, viewport } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const canvasSize = {
        'x': window.innerWidth,
        'y': window.innerHeight
    };

    const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const render = () => {
            context.save();

            // Clear the entire visible canvas (important for pan/zoom)
            context.fillStyle = backgroundColor || '#FFFFFF';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);

            // Apply viewport transformations
            context.translate(viewport.x, viewport.y);
            context.scale(viewport.scale, viewport.scale);

            draw(context);

            if (mousePos) {
                context.save();
                context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw crosshair in screen coords
                context.strokeStyle = 'rgba(0,0,0,0.5)';
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(mousePos.x, 0);
                context.lineTo(mousePos.x, canvas.height);
                context.moveTo(0, mousePos.y);
                context.lineTo(canvas.width, mousePos.y);
                context.stroke();
                context.restore();
            }

            context.restore();

        };

        render();
    }, [draw, viewport, mousePos]);

    const toCanvasCoords = (clientX: number, clientY: number, viewport: {x: number, y: number, scale: number}) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        // Subtract pan offset, then scale
        let x = (clientX - rect.left - viewport.x) / viewport.scale;
        let y = (clientY - rect.top - viewport.y) / viewport.scale;
        return { x, y };
    };

    // TODO: add tool default behaviours for certain button presses.
    // For example, select tool MMB should pan
    // Fix jitter/jumping from Pan tool (caused by different coordinate
    // systems for mouseUp/Down and Move) CURRENT SOLUTION SUCKS!

    return (
        <canvas
            ref={canvasRef}
            width={canvasSize.x}
            height={canvasSize.y}
            onMouseDown={(e) => {
                if (toolSystem.currentTool?.name === 'Pan') {
                    toolSystem.handleMouseDown(e.button, { x: e.clientX, y: e.clientY });
                }
                else {
                    const pos = toCanvasCoords(e.clientX, e.clientY, viewport);
                    if (pos) toolSystem.handleMouseDown(e.button, pos);
                }
            }}
            onMouseUp={(e) => {
                if (toolSystem.currentTool?.name === 'Pan') {
                    toolSystem.handleMouseUp(e.button, { x: e.clientX, y: e.clientY });
                }
                else {
                    const pos = toCanvasCoords(e.clientX, e.clientY, viewport);
                    if (pos) toolSystem.handleMouseUp(e.button, pos);
                }
            }}
            onMouseMove={(e) => {
                if (canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect();
                    setMousePos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    });
                }

                if (toolSystem.currentTool?.name === 'Pan') {
                    toolSystem.handleMouseMove({ x: e.clientX, y: e.clientY });
                }
                else {
                    const pos = toCanvasCoords(e.clientX, e.clientY, viewport);
                    if (pos) toolSystem.handleMouseMove(pos);
                }
            }}
            onKeyDown={(e) => {
                toolSystem.handleKeyDown(e);
            }}
            onKeyUp={(e) => {
                toolSystem.handleKeyDown(e);
            }}
            onMouseLeave={(e) => {
                setMousePos(null)
                toolSystem.handleMouseLeave(e);
            }}
        />
    );
};

export default Canvas;