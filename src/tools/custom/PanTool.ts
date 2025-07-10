import { ToolBase } from '../Tool';
import { HandIcon } from '@radix-ui/react-icons';
import { screenToWorld } from '../helpers';
import type ToolSystem from '../ToolSystem';

/**
 * Allows the user to pan/zoom the canvas.
 */
class PanTool extends ToolBase {
    isPanning: boolean;
    lastPos: {x: number, y: number} | null;

    constructor(toolSystem: ToolSystem) {
        super(toolSystem, "Pan", HandIcon, "H");
        this.isPanning = false;
        this.lastPos = null;
    }

    onMouseDown(button: number, position: {x: number, y: number}, canvasRect: DOMRect) {
        switch (button) {
            case 0:
                this.onMB0(position);
                break;
        }
    }

    onMB0(position: {x: number, y: number}) {
        this.isPanning = true;
        this.lastPos = position;
    }

    onMouseMove(position: {x: number, y: number}) {
        if (!this.isPanning || !this.lastPos) return;

        const dx = position.x - this.lastPos.x;
        const dy = position.y - this.lastPos.y;

        const scale = this.toolSystem.viewport?.scale || 1;
        this.toolSystem.setViewport((prev) => ({
            ...prev,
            x: prev.x + dx / scale,
            y: prev.y + dy / scale
        }));

        this.lastPos = position;
    }

    onMouseUp(button: number, position: {x: number, y: number}) {
        this.isPanning = false;
        this.lastPos = null;
    }

    onScroll(deltaY: number, position: {x: number, y: number}, canvasRect: DOMRect) {
        // Zoom factor per scroll "tick"
        const ZOOM_SENSITIVITY = 1.1;
        const minScale = 0.05;
        const maxScale = 10;

        const { x, y, scale } = this.toolSystem.viewport;
        const newScale = Math.max(minScale, Math.min(maxScale, deltaY < 0 ? scale * ZOOM_SENSITIVITY : scale / ZOOM_SENSITIVITY));

        const mouseWorld = screenToWorld(position, this.toolSystem.viewport, canvasRect);

        const px = position.x - canvasRect.left;
        const py = position.y - canvasRect.top;

        const newX = (px / newScale) - mouseWorld.x;
        const newY = (py / newScale) - mouseWorld.y;

        this.toolSystem.setViewport((prev) => ({
            ...prev,
            x: newX,
            y: newY,
            scale: newScale,
        }));
    }

    onMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {
        this.isPanning = false;
        this.lastPos = null;
    }
}

export default PanTool;