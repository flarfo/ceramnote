import { ToolBase } from '../Tool';
import { HandIcon } from '@radix-ui/react-icons';

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

    onMouseLeave(event) {
        this.isPanning = false;
        this.lastPos = null;
    }
}

export default PanTool;