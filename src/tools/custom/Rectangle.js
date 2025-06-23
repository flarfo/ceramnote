// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { Annotation } from '@components/Annotation';
import { SquareIcon } from '@radix-ui/react-icons';
import { toCanvasCoords } from '@tools/helpers';

class RectangleTool extends ToolBase {
    constructor(toolSystem) {
        super(toolSystem, "Rectangle", SquareIcon, "R");
        this.startPoint = null;
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
            console.log(canvasRect);
            this.startPoint = toCanvasCoords(position, this.toolSystem.viewport, canvasRect);
        } 
        else {
            // Second click: create rectangle annotation
            const bounds = [
                this.startPoint,
                toCanvasCoords(position, this.toolSystem.viewport, canvasRect)
            ];
            const annotation = new Annotation("rectangle", "#FF0000", bounds);
            this.toolSystem.addAnnotation(annotation);
            this.startPoint = null;
        }
    }

    // MMB
    onMB1(position, canvasRect) {
        console.log('MB1');
    }

    // RMB
    onMB2(position, canvasRect) {
        console.log('MB2');
    }

    onMouseMove(event, canvasRect) {
        // Could be used for live preview (not implemented here)
    }
}

export default RectangleTool;