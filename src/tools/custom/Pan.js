import { ScrollArea } from 'radix-ui';
import { ToolBase } from '../Tool';
import { HandIcon } from '@radix-ui/react-icons';
import { screenToWorld } from '@tools/helpers';

class PanTool extends ToolBase {
    constructor(toolSystem) {
        super(toolSystem, "Pan", HandIcon, "H");
        this.isPanning = false;
        this.lastPos = null;
    }

    onMouseDown(button, position, canvasRect) {
        this.isPanning = true;
        this.lastPos = position;
    }

    onMouseMove(position, canvasRect) {
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

    onMouseUp(button, position, canvasRect) {
        this.isPanning = false;
        this.lastPos = null;
    }

    onScroll(deltaY, position, canvasRect) {
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

    onMouseLeave(event) {
        this.isPanning = false;
        this.lastPos = null;
    }
}

export default PanTool;