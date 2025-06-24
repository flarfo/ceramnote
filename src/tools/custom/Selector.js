// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { Annotation } from '@components/Annotation';
import { CursorArrowIcon } from '@radix-ui/react-icons';
import { screenToWorld, inBounds } from '@tools/helpers';

class SelectorTool extends ToolBase {
    constructor(toolSystem) {
        super(toolSystem, "Selector", CursorArrowIcon, "W");
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
    onMB1(position, canvasRect) {
    }

    // RMB
    onMB2(position, canvasRect) {
    }

    onMouseMove(event, canvasRect) {
    }

    onMouseLeave(event) {
    }
}

export default SelectorTool;