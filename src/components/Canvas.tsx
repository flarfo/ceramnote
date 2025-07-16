import { useRef, useEffect, useState } from 'react';
import type ToolSystem from '../tools/ToolSystem';
import { Annotation } from './Annotation';
import JSZip from 'jszip';
import type { ConfigManager } from '../tools/config_manager';
import {FastAverageColor, type FastAverageColorResult} from 'fast-average-color';
import rgbToLab from '@fantasy-color/rgb-to-lab'

const hexToRgba = (hex: string, alpha: number = 1.0) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : 'rgba(0, 0, 0, 1.0)';
}

const hexToInverseRgba = (hex: string, alpha: number = 1.0) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgba(${255 - parseInt(result[1], 16)}, ${255 - parseInt(result[2], 16)}, ${255 - parseInt(result[3], 16)}, ${alpha})` : 'rgba(0, 0, 0, 1.0)';
}

interface CanvasProps {
    image: HTMLImageElement;
    currentImageId: string;
    backgroundColor: string;
    toolSystem: ToolSystem;
    configManager: ConfigManager;
    viewport: { x: number, y: number, scale: number };
}

/**
 * Canvas component for rendering image and annotations.
 * Handles drawing, event detection, and exporting annotations.
 */
const Canvas: React.FC<CanvasProps> = (props) => {
    const { image, currentImageId, backgroundColor, toolSystem, configManager, viewport } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const canvasSize = {
        'x': window.innerWidth,
        'y': window.innerHeight
    };

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = canvasSize.x * devicePixelRatio;
    const canvasHeight = canvasSize.y * devicePixelRatio;

    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    /**
     * Saves all images to annotations.zip/images and all annotations to annotations.zip/annotations.json.
     * Save code found in Annotation.save() [<-- TO IMPLEMENT]
     */
    const save = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Create new zip folder to store all data
        const zip = new JSZip();
        const imagesFolder = zip.folder('images');
        const annotationsData: { annotation: Annotation; imageUrl: string }[] = [];

        const annots = Object.values(toolSystem?.annotations?.[currentImageId] || []);
        for (const annotation of annots) {
            // TODO: Move save function to the object itself
            if (annotation.bounds && annotation.bounds.length === 2) {
                const [start, end] = annotation.bounds;

                // Calculate crop dimensions
                const x = Math.min(start.x, end.x);
                const y = Math.min(start.y, end.y);
                const width = Math.abs(end.x - start.x);
                const height = Math.abs(end.y - start.y);

                // Create a temporary canvas for the crop
                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = width;
                cropCanvas.height = height;

                const cropContext = cropCanvas.getContext('2d');
                if (!cropContext) return;

                // Draw the cropped image onto temp canvas
                cropContext.drawImage(image, x, y, width, height, 0, 0, width, height);

                // Get cropped image URL
                // NOTE: blob MIME type MUST match original image MIME type, or size is MASSIVELY inflated (~5x)
                // TODO: track MIME type of original image so multiple filetypes are supported
                const blob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, 'image/jpeg', 0.95));
                if (blob) {
                    const fileName = `${annotation.id}.jpg`;
                    imagesFolder?.file(fileName, blob);

                    // Gets the average color and adds to annotation
                    const url = URL.createObjectURL(blob);
                    const fac = new FastAverageColor();
                    fac.getColorAsync(url, {algorithm: 'dominant'})
                        .then((color: FastAverageColorResult) => {
                            console.log('Average color', color.rgb)
                            const color_string = color.rgb.split(/[,()]/);
                            const red = parseFloat(color_string[1]);
                            const green = parseFloat(color_string[2]);
                            const blue = parseFloat(color_string[3]);
                            const lab = rgbToLab({red, green, blue})
                            annotation.tile_data.ColorL = lab.luminance;
                            annotation.tile_data.ColorA = lab.a;
                            annotation.tile_data.ColorB = lab.b;
                        });


                    // Add annotation data to JSON
                    annotationsData.push({
                        annotation: annotation,
                        imageUrl: `images/${fileName}`,
                    });
                }
            }
        }

        // Add the JSON file to the ZIP
        zip.file('annotations.json', JSON.stringify(annotationsData, null, 2));

        // Generate the ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = 'annotations.zip';
        a.click();
        URL.revokeObjectURL(zipUrl);
    };

    // Draw all annotations
    const draw = (ctx: CanvasRenderingContext2D) => {
        // See tools/helpers.ts: screenToWorld / worldToScreen for more.
        // screen = (world + viewport) * scale
        // world = (screen / scale) - viewport
        if (image) {
            ctx.drawImage(image, 0, 0);
        }

        // Draw grid
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

        const annots = Object.values(toolSystem?.annotations?.[currentImageId] || []);
        annots.forEach((annot: Annotation) => {
            // Draw rectangle annotations for the current image
            if (annot.type === 'rectangle' && annot.bounds && annot.bounds.length === 2) {
                const selected = toolSystem?.selectedAnnotationIDs.includes(annot.id);

                // Get bounds
                const [start, end] = annot.bounds;
                const x = Math.min(start.x, end.x);
                const y = Math.min(start.y, end.y);
                const w = Math.abs(end.x - start.x);
                const h = Math.abs(end.y - start.y);
                ctx.save();

                const baseColor = configManager.getClassColor(annot.name);

                const color = hexToRgba(baseColor, 0.2);
                const inverse = hexToInverseRgba(baseColor, 0.2);

                ctx.strokeStyle = selected ? inverse : color;
                ctx.lineWidth = 1 / (viewport?.scale || 1);
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = selected ? inverse : color;
                ctx.fillRect(x, y, w, h);

                // Conditional drawing for currently selected annotation(s)
                if (selected) {
                    // Display text
                    const fontSize = Math.max(20, 8 / viewport?.scale || 1);
                    const padding = Math.max(4, fontSize * 0.2);
                    ctx.font = `${fontSize}px Arial`;
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = selected ? hexToInverseRgba(baseColor, 0.75) : hexToRgba(baseColor, 0.75);
                    ctx.fillText(annot.name, x + padding, y + padding);

                    ctx.lineWidth = 30;
                    ctx.fillStyle = hexToInverseRgba(baseColor, 0.9);
                    // Draw associations (line from selected annotation to associated annotation)
                    annot.associations.forEach((association: Annotation) => {
                        const [aStart, aEnd] = association.bounds;
                        const aX = Math.min(aStart.x, aEnd.x);
                        const aY = Math.min(aStart.y, aEnd.y);
                        const aW = Math.abs(aEnd.x - aStart.x);
                        const aH = Math.abs(aEnd.y - aStart.y);

                        ctx.beginPath();
                        ctx.moveTo(x + w / 2, y + h / 2);
                        ctx.lineTo(aX + aW / 2, aY + aH / 2);
                        ctx.stroke();
                    });
                }

                ctx.restore();
            }
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        /**
         * Handles rendering and scale/translation for the canvas.
         * Adds additional features, i.e. mouse crosshair.
         */
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

            // Draw mouse crosshair
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
    // All tool event handlers rooted here:
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
                if (e.key === ' ') {
                    save();
                }

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