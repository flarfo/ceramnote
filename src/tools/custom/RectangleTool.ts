// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { Annotation } from '../../components/Annotation';
import { SquareIcon } from '@radix-ui/react-icons';
import { screenToWorld } from '../helpers';
import type ToolSystem from '../ToolSystem';

class RectangleTool extends ToolBase {
    startPoint: {x: number, y: number} | null;
    curAnnotation: Annotation | null;

    constructor(toolSystem: ToolSystem) {
        super(toolSystem, "Rectangle", SquareIcon, "R");
        this.startPoint = null;
        this.curAnnotation = null;
    }

    onToolSelected() {
        this.startPoint = null;
    }

    onMouseDown(button: number, position: {x: number, y: number}, canvasRect: DOMRect) {
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
    onMB0(position: {x: number, y: number}, canvasRect: DOMRect) {
        if (!this.startPoint) {
            this.startPoint = screenToWorld(position, this.toolSystem.viewport, canvasRect)

            const name = this.toolSystem.getCurrentAnnotationClass();
            this.curAnnotation = new Annotation("rectangle", [this.startPoint, this.startPoint], [], name);
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
    onMB1(position: {x: number, y: number}, canvasRect: DOMRect) {
    }

    // RMB
    onMB2(position: {x: number, y: number}, canvasRect: DOMRect) {
    }

    onMouseMove(position: {x: number, y: number}, canvasRect: DOMRect) {
        // Live preview (if start point already set)
        if (this.startPoint) {
            const bounds = [
                this.startPoint,
                screenToWorld(position, this.toolSystem.viewport, canvasRect)
            ];

            if (this.curAnnotation) {
                this.curAnnotation.bounds = bounds;
                this.toolSystem.addAnnotation(this.curAnnotation);
            }
        } 
    }

    onMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {
        this.startPoint = null;

        if (this.curAnnotation != null) {
            this.toolSystem.removeAnnotation(this.curAnnotation);
            this.curAnnotation = null;
        }
    }
}

export default RectangleTool;