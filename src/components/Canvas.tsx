import { useRef, useEffect, useState } from 'react';
import type ToolSystem from '../tools/ToolSystem';
import type { Annotation } from './Annotation';

interface CanvasProps {
    image: HTMLImageElement;
    currentImageId: string;
    backgroundColor: string;
    toolSystem: ToolSystem;
    viewport: { x: number, y: number, scale: number };
};

const Canvas: React.FC<CanvasProps> = (props) => {
    const { image, currentImageId, backgroundColor, toolSystem, viewport } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const canvasSize = {
        'x': window.innerWidth,
        'y': window.innerHeight
    };

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = canvasSize.x * devicePixelRatio;
    const canvasHeight = canvasSize.y * devicePixelRatio;

    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    // Draw all annotations
    const draw = (ctx: CanvasRenderingContext2D) => {
        // screen = (world + viewport) * scale
        // world = (screen / scale) - viewport
        if (image) {
            ctx.drawImage(image, 0, 0);
        }

        // Draw grid (optional, as before)
        if (viewport) {
            ctx.strokeStyle = `rgba(100,100,100,0.15)`;
            ctx.lineWidth = 0.8 / viewport.scale;

            const worldLeft = -viewport.x;
            const worldTop = -viewport.y;
            const worldRight = (ctx.canvas.width / viewport.scale) - viewport.x;
            const worldBottom = (ctx.canvas.height / viewport.scale) - viewport.y;
            const step = 100;

            ctx.beginPath();
            for (let x = Math.floor(worldLeft / step) * step; x < worldRight; x += step) {
                ctx.moveTo(x, worldTop);
                ctx.lineTo(x, worldBottom);
            }
            for (let y = Math.floor(worldTop / step) * step; y < worldBottom; y += step) {
                ctx.moveTo(worldLeft, y);
                ctx.lineTo(worldRight, y);
            }

            ctx.stroke();
        }

        // Draw rectangle annotations for the current image
        const annots = Object.values(toolSystem?.annotations?.[currentImageId] || []);
        annots.forEach((annot: Annotation) => {
            if (annot.type === 'rectangle' && annot.bounds && annot.bounds.length === 2) {
                const selected = toolSystem?.selectedAnnotationIDs.includes(annot.id);

                const [start, end] = annot.bounds;
                const x = Math.min(start.x, end.x);
                const y = Math.min(start.y, end.y);
                const w = Math.abs(end.x - start.x);
                const h = Math.abs(end.y - start.y);
                ctx.save();
                ctx.strokeStyle = annot.color || '#FF0000';
                ctx.lineWidth = 1 / (viewport?.scale || 1);
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = selected ? `rgba(0, 125, 180, 0.25)` : `rgba(255, 0, 0, 0.25)`;
                ctx.fillRect(x, y, w, h);
                ctx.restore();

                const fontSize = Math.max(40, 10 / viewport?.scale || 1);
                const padding = Math.max(4, fontSize * 0.2); // or Math.max(4, fontSize * 0.2)
                ctx.font = `${fontSize}px Arial`;
                ctx.textBaseline = 'top';
                ctx.fillStyle = selected ? '#007DB4' : '#B41414';
                ctx.fillText(annot.name, x + padding, y + padding);
            }
        });
    };

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

            context.setTransform(1, 0, 0, 1, 0, 0); // Reset any existing transform
            context.scale(devicePixelRatio, devicePixelRatio); // Scale for high-DPI

            // Apply viewport transformations
            context.scale(viewport.scale, viewport.scale);
            context.translate(viewport.x, viewport.y);

            draw(context);

            if (mousePos) {
                context.save();
                context.setTransform(1, 0, 0, 1, 0, 0);
                context.strokeStyle = 'rgba(0,0,0,0.5)';
                context.lineWidth = 1;
                context.beginPath();
                const mx = mousePos.x * devicePixelRatio;
                const my = mousePos.y * devicePixelRatio;
                context.moveTo(mx, 0);
                context.lineTo(mx, canvas.height);
                context.moveTo(0, my);
                context.lineTo(canvas.width, my);
                context.stroke();
                context.restore();
            }

            context.restore();

        };

        render();
    }, [draw, viewport, mousePos]);

    // TODO: add tool default behaviours for certain button presses.
    // For example, select tool MMB should pan
    return (
        <canvas
            ref={canvasRef}
            tabIndex={0}
            width={canvasWidth}
            height={canvasHeight}
            style={{
                width: `${canvasSize.x}px`,
                height: `${canvasSize.y}px`,
                display: 'block'
            }}
            onMouseDown={(e) => {
                if (!canvasRef.current) {
                    return;
                }

                toolSystem.handleMouseDown(e.button, { x: e.clientX, y: e.clientY }, canvasRef.current.getBoundingClientRect());
            }}
            onMouseUp={(e) => {
                if (!canvasRef.current) {
                    return;
                }

                toolSystem.handleMouseUp(e.button, { x: e.clientX, y: e.clientY }, canvasRef.current.getBoundingClientRect());
            }}
            onMouseMove={(e) => {
                if (!canvasRef.current) {
                    return;

                }

                const rect = canvasRef.current.getBoundingClientRect();
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });

                toolSystem.handleMouseMove({ x: e.clientX, y: e.clientY }, rect);
            }}
            onWheel={(e) => {
                if (!canvasRef.current) {
                    return;
                }

                e.preventDefault();
                toolSystem.handleScroll(e.deltaY, { x: e.clientX, y: e.clientY }, canvasRef.current.getBoundingClientRect())
            }}
            onScroll={(e) => {
                e.preventDefault();
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