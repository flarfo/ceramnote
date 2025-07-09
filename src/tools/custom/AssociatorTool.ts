// Rectangle annotation tool
import { ToolBase } from '../Tool';
import { Link1Icon } from '@radix-ui/react-icons';
import { screenToWorld, inBounds } from '../helpers';
import type ToolSystem from '../ToolSystem';
import type { Annotation } from '../../components/Annotation';

// TODO: store associations as IDs, also provide indicator for annotation occurring
class AssociatorTool extends ToolBase {
    selectedAnnotations: Annotation[] = [];
    constructor(toolSystem: ToolSystem) {
        super(toolSystem, "Associator", Link1Icon, "W");
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
        const annotations = Object.values(this.toolSystem.annotations[this.toolSystem.currentImageId]);
        const worldPos = screenToWorld(position, this.toolSystem.viewport, canvasRect);

        if (this.selectedAnnotations.length === 0) {
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
    
                if (inBounds(worldPos, annotation.bounds)) {
                    this.selectedAnnotations.push(annotation);
                }
            }
        }
        else if (this.selectedAnnotations.length > 0) {
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
    
                if (inBounds(worldPos, annotation.bounds)) {
                    for (let j = 0; j < this.selectedAnnotations.length; j++) {
                        console.log('Annotation added.');
                        this.selectedAnnotations[j].addAssociation(annotation);
                    }
                }
            }

            this.selectedAnnotations = [];
        }
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

export default AssociatorTool;