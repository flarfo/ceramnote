import { useRef, useEffect, useState } from 'react';
import type ToolSystem from '../tools/ToolSystem';

interface CanvasProps {
    image: HTMLImageElement;
    currentImageId: string;
    backgroundColor: string;
    toolSystem: ToolSystem;
    viewport: {x: number, y: number, scale: number};
};

const Canvas: React.FC<CanvasProps> = (props) => {
    const { image, currentImageId, backgroundColor, toolSystem, viewport } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const canvasSize = {
        'x': window.innerWidth,
        'y': window.innerHeight
    };

    const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

    // Draw all annotations
	const draw = (ctx: CanvasRenderingContext2D) => {
		if (image) {
			ctx.drawImage(image, 0, 0);
		}

		// Draw grid (optional, as before)
		if (viewport) {
			ctx.strokeStyle = `rgba(100,100,100,0.15)`;
			ctx.lineWidth = 0.8 / viewport.scale;

			const worldViewWidth = ctx.canvas.width / viewport.scale;
			const worldViewHeight = ctx.canvas.height / viewport.scale;
			const originXInView = -viewport.x / viewport.scale;
			const originYInView = -viewport.y / viewport.scale;
			const step = 100;
			ctx.beginPath();
			for (let x = Math.floor(originXInView / step) * step; x < originXInView + worldViewWidth; x += step) {
				ctx.moveTo(x, originYInView);
				ctx.lineTo(x, originYInView + worldViewHeight);
			}

			for (let y = Math.floor(originYInView / step) * step; y < originYInView + worldViewHeight; y += step) {
				ctx.moveTo(originXInView, y);
				ctx.lineTo(originXInView + worldViewWidth, y);
			}

			ctx.stroke();
		}

		// Draw rectangle annotations for the current image
		const annots = (toolSystem?.annotations as any)?.[currentImageId] || [];
		annots.forEach((annot: any) => {
			if (annot.type === 'rectangle' && annot.bounds && annot.bounds.length === 2) {
				const [start, end] = annot.bounds;
				const x = Math.min(start.x, end.x);
				const y = Math.min(start.y, end.y);
				const w = Math.abs(end.x - start.x);
				const h = Math.abs(end.y - start.y);
				ctx.save();
				ctx.strokeStyle = annot.color || '#FF0000';
				ctx.lineWidth = 2 / (viewport?.scale || 1);
				ctx.strokeRect(x, y, w, h);
				ctx.fillStyle = `rgba(255, 0, 0, 0.25)`;
				ctx.fillRect(x, y, w, h);
				ctx.restore();
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

    // TODO: add tool default behaviours for certain button presses.
    // For example, select tool MMB should pan
    return (
        <canvas
            ref={canvasRef}
            width={canvasSize.x}
            height={canvasSize.y}
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