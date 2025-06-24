// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { Annotation } from '@components/Annotation';
import { SquareIcon } from '@radix-ui/react-icons';
import { screenToWorld } from '@tools/helpers';

class RectangleTool extends ToolBase {
    constructor(toolSystem) {
        super(toolSystem, "Rectangle", SquareIcon, "R");
        this.startPoint = null;
        this.curAnnotation = null;
    }

    onToolSelected() {
        this.startPoint = null;
    }

    onMouseDown(button, position, canvasRect) {
        switch (button) {
            case 0:
                this.onMB0(position, canvasRect);
                break;
            case 1:
                this.onMB1(position, canvasRect);
                break;
            case 2:
                this.onMB2(position, canvasRect);
                break;
        }
    }

    // LMB
    onMB0(position, canvasRect) {
        if (!this.startPoint) {
            this.startPoint = screenToWorld(position, this.toolSystem.viewport, canvasRect)
            this.curAnnotation = new Annotation("rectangle", 'rgba(255, 0, 0, 0.25)', [this.startPoint, this.startPoint]);
        } 
        else {
            // Second click: create rectangle annotation
            const bounds = [
                this.startPoint,
                screenToWorld(position, this.toolSystem.viewport, canvasRect)
            ];

            if (this.curAnnotation) {
                this.curAnnotation.bounds = bounds;
                this.toolSystem.addAnnotation(this.curAnnotation);
            }

            this.startPoint = null;
            this.curAnnotation = null;
        }
    }

    // MMB
    onMB1(position, canvasRect) {
    }

    // RMB
    onMB2(position, canvasRect) {
    }

    onMouseMove(position, canvasRect) {
        // Live preview (if start point already set)
        if (this.startPoint) {
            const bounds = [
                this.startPoint,
                screenToWorld(position, this.toolSystem.viewport, canvasRect)
            ];

            this.curAnnotation.bounds = bounds;
            this.toolSystem.addAnnotation(this.curAnnotation);
        } 
    }

    onMouseLeave(event) {
        this.startPoint = null;

        if (this.curAnnotation != null) {
            this.toolSystem.removeAnnotation(this.curAnnotation);
            this.curAnnotation = null;
        }
    }
}

export default RectangleTool;