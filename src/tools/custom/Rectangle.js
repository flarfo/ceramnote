// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { Annotation } from '@components/Annotation';
import { SquareIcon } from '@radix-ui/react-icons';

class RectangleTool extends ToolBase {
    constructor(toolSystem) {
        super(toolSystem, "Rectangle", SquareIcon, "R");
        this.startPoint = null;
    }

    onToolSelected() {
        this.startPoint = null;
    }

    onMouseDown(button, position, toolSystem) {
        console.log(button);
        switch (button) {
            case 0:
                this.onMB0(position, toolSystem);
                break;
            case 1:
                this.onMB1(position, toolSystem);
                break;
            case 2:
                this.onMB2(position, toolSystem);
                break;
        }

        console.log(button);
        if (!this.startPoint) {
            this.startPoint = position;
        } 
        else {
            // Second click: create rectangle annotation
            const bounds = [
                this.startPoint,
                position
            ];
            const annotation = new Annotation("rectangle", "#FF0000", bounds);
            this.toolSystem.addAnnotation(annotation);
            this.startPoint = null;
        }
    }

    // LMB
    onMB0(position, toolSystem) {
        console.log('MB0');
    }

    // MMB
    onMB1(position, toolSystem) {
        console.log('MB1');
    }

    // RMB
    onMB2(position, toolSystem) {
        console.log('MB2');
    }

    onMouseMove(event, toolSystem) {
        // Could be used for live preview (not implemented here)
    }
}

export default RectangleTool;