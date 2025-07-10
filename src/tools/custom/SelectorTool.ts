// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { CursorArrowIcon } from '@radix-ui/react-icons';
import { screenToWorld, inBounds } from '../helpers';
import type ToolSystem from '../ToolSystem';

/**
 * Allows the user to click and select an annotation.
 */
class SelectorTool extends ToolBase {
    constructor(toolSystem: ToolSystem) {
        super(toolSystem, "Selector", CursorArrowIcon, "W");
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
        const selectedAnnotationsIDs = [];
        const annotations = Object.values(this.toolSystem.annotations[this.toolSystem.currentImageId]);

        for (let i = 0; i < annotations.length; i++) {
            const annotation = annotations[i];
            const worldPos = screenToWorld(position, this.toolSystem.viewport, canvasRect);

            if (inBounds(worldPos, annotation.bounds)) {
                selectedAnnotationsIDs.push(annotation.id);
            }
        }

        this.toolSystem.selectAnnotations(selectedAnnotationsIDs);
    }

    // MMB
    onMB1(position: {x: number, y: number}, canvasRect: DOMRect) {
    }

    // RMB
    onMB2(position: {x: number, y: number}, canvasRect: DOMRect) {
    }

    onMouseMove(position: { x: number, y: number }, canvasRect: DOMRect) {
    }

    onMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {
    }
}

export default SelectorTool;