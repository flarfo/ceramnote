// Global tool manager, this will handle the base logic driving all classes extending Tool (defined in ../tools/custom).
// Iterate over all tools and create a list from which to render toolbar, identify current event overrides.
// Store currentTool, handle keybindings, etc.
import { ToolBase } from './Tool';
import { Annotation } from '../components/Annotation';
import { AnnotationHandle } from '../components/AnnotationHandle';
import RectangleTool from './custom/RectangleTool';
import PanTool from './custom/PanTool';
import SelectorTool from './custom/SelectorTool';
import { TriangleRightIcon } from '@radix-ui/react-icons';
import React from 'react';
import { ConfigManager } from './config_manager';

/**
 * Tool manager; handles state for annotations and provides global access to 
 * currently loaded tools.
 */
export class ToolSystem {
    tools: ToolBase[] = [];
    currentTool: ToolBase | null = null;
    annotations: { [imageIndex: number]: { [annotationId: string]: Annotation } } = {};
    selectedAnnotationIDs: string[] = [];
    selectedHandle: AnnotationHandle | null = null;
    keybindMap: { [key: string]: string } = {};
    toolConfig: { [key: string]: any } = {};
    currentImageIndex: number = 0;
    currentAnnotationClass: string = '';
    annotationGrid: Annotation[][] = [];
    gridPosition: { row: number, col: number } = { row: 0, col: 0 };
    viewport: { x: number, y: number, scale: number };
    setViewport: React.Dispatch<React.SetStateAction<{ x: number, y: number, scale: number }>>;
    setSelectedAnnotationIDs: React.Dispatch<React.SetStateAction<string[]>>;
    configManager: ConfigManager | null = null;
    onToolChange?: (tool: ToolBase | null) => void;
    onAnnotationClassChange?: (className: string) => void;

    constructor(
        setViewport: React.Dispatch<React.SetStateAction<{ x: number, y: number, scale: number }>>,
        setSelectedAnnotationIDs: React.Dispatch<React.SetStateAction<string[]>>,
        configManager?: ConfigManager,
        onToolChange?: (tool: ToolBase | null) => void,
        onAnnotationClassChange?: (className: string) => void,
    ) {
        // Register tools
        this.tools = [
            new PanTool(this),
            new SelectorTool(this),
            new RectangleTool(this),
        ];
        this.setViewport = setViewport;
        this.setSelectedAnnotationIDs = setSelectedAnnotationIDs;
        this.onAnnotationClassChange = onAnnotationClassChange;
        this.configManager = configManager || null;
        this.onToolChange = onToolChange;
        this.viewport = { x: 0, y: 0, scale: 1 };
        this.keybindMap = configManager?.getKeybinds() || {};
        this.toolConfig = {}; // Set config via useEffect onUpload?

        // Set default tool to first tool
        if (this.tools.length > 0) {
            this.setCurrentTool(this.tools[0]);
        }
    }

    /**
     * Set the currently selected tool.
     * @param tool Tool to select
     */
    setCurrentTool(tool: ToolBase) {
        this.currentTool = tool;
        tool.onToolSelected(this);
        // Notify the callback about tool change
        if (this.onToolChange) {
            this.onToolChange(tool);
        }
    }

    /**
     * Get the currently selected annotation class.
     * @returns Class name
     */
    getCurrentAnnotationClass(): string {
        // If no class is selected, default to the first available class
        if (!this.currentAnnotationClass) {
            const classNames = this.configManager?.getClassNames() || {};
            const classKeys = Object.keys(classNames);

            if (classKeys.length > 0) {
                this.currentAnnotationClass = classKeys[0];
            } else {
                // Fallback if no classes exist
                this.currentAnnotationClass = 'Default';
            }
        }

        return this.currentAnnotationClass;
    }

    /**
     * Set the currently selected annotation class.
     * @param className Name of class to set
     */
    setCurrentAnnotationClass(className: string): void {
        const classNames = this.configManager?.getClassNames() || {};
        if (classNames[className]) {
            this.currentAnnotationClass = className;
            // Notify about the change
            this.onAnnotationClassChange?.(className);
        }
    }

    // Method to update keybinds when config changes
    updateKeybinds() {
        if (this.configManager) {
            this.keybindMap = this.configManager.getKeybinds();
        }
    }

    /**
     * Add new annotation to current image's annotations.
     * @param annotation Annotation to add
     */
    addAnnotation(annotation: Annotation) {
        if (!this.annotations[this.currentImageIndex]) {
            this.annotations[this.currentImageIndex] = {};
        }

        this.annotations[this.currentImageIndex][annotation.id] = annotation;

        // Rebuild the grid after adding annotation
        this.buildAnnotationGrid();
    }

    removeAnnotation(annotationID: string) {
        delete this.annotations[this.currentImageIndex][annotationID];
        this.setSelectedAnnotationIDs([]);
        // Rebuild the grid after removing annotation
        this.buildAnnotationGrid();
    }

    getAnnotation(annotationID: string) {
        if (this.annotations[this.currentImageIndex][annotationID] !== null) {
            return this.annotations[this.currentImageIndex][annotationID];
        }

        return null;
    }

    /**
     * Builds a 2D grid of annotations sorted by their Y positions (rows) and X positions (columns)
     */
    buildAnnotationGrid() {
        const annotations = Object.values(this.annotations[this.currentImageIndex] || []);

        if (annotations.length === 0) {
            this.annotationGrid = [];
            this.gridPosition = { row: 0, col: 0 };
            return;
        }

        // Group annotations by approximate Y position
        const rowThreshold = 50; // Pixels tolerance for same row
        const rows: { y: number, annotations: Annotation[] }[] = [];

        annotations.forEach(annotation => {
            if (!annotation.bounds || annotation.bounds.length < 2) return;

            const centerY = (annotation.bounds[0].y + annotation.bounds[1].y) / 2;

            // Find existing row or create new one
            let targetRow = rows.find(row => Math.abs(row.y - centerY) <= rowThreshold);

            if (!targetRow) {
                targetRow = { y: centerY, annotations: [] };
                rows.push(targetRow);
            }

            targetRow.annotations.push(annotation);
        });

        // Sort rows by Y position (top to bottom)
        rows.sort((a, b) => a.y - b.y);

        // Sort annotations within each row by X position (left to right)
        rows.forEach(row => {
            row.annotations.sort((a, b) => {
                const centerXA = (a.bounds[0].x + a.bounds[1].x) / 2;
                const centerXB = (b.bounds[0].x + b.bounds[1].x) / 2;
                return centerXA - centerXB;
            });
        });

        // Build the 2D grid
        this.annotationGrid = rows.map(row => row.annotations);

        // Reset grid position if current position is invalid
        if (this.gridPosition.row >= this.annotationGrid.length) {
            this.gridPosition.row = Math.max(0, this.annotationGrid.length - 1);
        }
        if (this.annotationGrid.length > 0 && this.gridPosition.col >= this.annotationGrid[this.gridPosition.row].length) {
            this.gridPosition.col = Math.max(0, this.annotationGrid[this.gridPosition.row].length - 1);
        }

        // If there are annotations but none selected, select the first one
        if (this.annotationGrid.length > 0 && this.selectedAnnotationIDs.length === 0) {
            this.gridPosition = { row: 0, col: 0 };
            this.selectAnnotationAtGridPosition();
        }
    }

    /**
     * Navigate the annotation grid with arrow keys
     * @param direction 'up' | 'down' | 'left' | 'right'
     */
    navigateAnnotationGrid(direction: 'up' | 'down' | 'left' | 'right') {
        if (this.annotationGrid.length === 0) return;

        const currentRow = this.gridPosition.row;
        const currentCol = this.gridPosition.col;

        switch (direction) {
            case 'up':
                if (currentRow > 0) {
                    const newRow = currentRow - 1;

                    // Get X position of current annotation
                    const currentAnnotation = this.annotationGrid[currentRow][currentCol];
                    const currentX = (currentAnnotation.bounds[0].x + currentAnnotation.bounds[1].x) / 2;

                    // Find closest annotation in the new row
                    let closestCol = 0;
                    let closestDistance = Number.MAX_VALUE;

                    for (let i = 0; i < this.annotationGrid[newRow].length; i++) {
                        const annotation = this.annotationGrid[newRow][i];
                        const annotationX = (annotation.bounds[0].x + annotation.bounds[1].x) / 2;
                        const distance = Math.abs(currentX - annotationX);

                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestCol = i;
                        }
                    }

                    this.gridPosition = {
                        row: newRow,
                        col: closestCol
                    };
                }
                break;
            case 'down':
                if (currentRow < this.annotationGrid.length - 1) {
                    const newRow = currentRow + 1;

                    // Get X position of current annotation
                    const currentAnnotation = this.annotationGrid[currentRow][currentCol];
                    const currentX = (currentAnnotation.bounds[0].x + currentAnnotation.bounds[1].x) / 2;

                    // Find closest annotation in the new row
                    let closestCol = 0;
                    let closestDistance = Number.MAX_VALUE;

                    for (let i = 0; i < this.annotationGrid[newRow].length; i++) {
                        const annotation = this.annotationGrid[newRow][i];
                        const annotationX = (annotation.bounds[0].x + annotation.bounds[1].x) / 2;
                        const distance = Math.abs(currentX - annotationX);

                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestCol = i;
                        }
                    }

                    this.gridPosition = {
                        row: newRow,
                        col: closestCol
                    };
                }
                break;
            case 'left':
                if (currentCol > 0) {
                    this.gridPosition = {
                        row: currentRow,
                        col: currentCol - 1
                    };
                }
                break;
            case 'right':
                if (currentCol < this.annotationGrid[currentRow].length - 1) {
                    this.gridPosition = {
                        row: currentRow,
                        col: currentCol + 1
                    };
                }
                break;
        }

        // Select the annotation at the new position
        this.selectAnnotationAtGridPosition();
    }

    /**
     * Selects the annotation at the current grid position
     */
    selectAnnotationAtGridPosition() {
        if (this.annotationGrid.length === 0 ||
            this.gridPosition.row >= this.annotationGrid.length ||
            this.gridPosition.col >= this.annotationGrid[this.gridPosition.row].length) {
            return;
        }

        const annotation = this.annotationGrid[this.gridPosition.row][this.gridPosition.col];
        this.selectAnnotations([annotation.id]);
    }

    /**
     * Updates the grid position to match the selected annotation
     * @param annotationId The ID of the selected annotation
     */
    updateGridPositionForSelectedAnnotation(annotationId: string) {
        for (let row = 0; row < this.annotationGrid.length; row++) {
            for (let col = 0; col < this.annotationGrid[row].length; col++) {
                if (this.annotationGrid[row][col].id === annotationId) {
                    this.gridPosition = { row, col };
                    return;
                }
            }
        }
    }

    selectAnnotations(annotationIDs: string[]) {
        this.selectedAnnotationIDs = annotationIDs;
        this.setSelectedAnnotationIDs(annotationIDs);

        // Update grid position to match the newly selected annotation
        if (annotationIDs.length === 1) {
            this.updateGridPositionForSelectedAnnotation(annotationIDs[0]);
        }
    }

    /**
     * Change currently loaded image (resets state, actual image handled in App.tsx)
     * @param index Image index in the FileList
     */
    setCurrentImage(index: number) {
        this.currentImageIndex = index;
        if (!this.annotations[index]) {
            this.annotations[index] = {};
        }

        this.selectedAnnotationIDs = [];
        this.setSelectedAnnotationIDs([]);
        this.selectedHandle = null;

        // Rebuild the grid for the new image
        this.buildAnnotationGrid();
    }

    // EVENT DISPATCHERS
    /**
     * Calls current tool's onKeyDown event.
     * Checks if key is mapped to a keybind.
     * @param event 
     */
    handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
        const key = event.key.toLowerCase();
        if (this.keybindMap[key]) {
            const toolName = this.keybindMap[key];
            const tool = this.tools.find(t => t.name === toolName);
            if (tool) this.setCurrentTool(tool);
        }

        if (this.currentTool) this.currentTool.onKeyDown(event);
    }

    /**
     * Calls current tool's onMouseDown event.
     * @param button Button ID
     * @param position Position of click
     * @param canvasRect Canvas dimensions (for coordinate conversion)
     */
    handleMouseDown(button: number, position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onMouseDown(button, position, canvasRect);
    }

    /**
     * Calls current tool's onMouseUp event.
     * @param button Button ID
     * @param position Position of mouseUp
     * @param canvasRect Canvas dimensions (for coordinate conversion)
     */
    handleMouseUp(button: number, position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onMouseUp(button, position, canvasRect);
    }

    /**
     * Calls current tool's onMouseMove event.
     * @param position Position of move
     * @param canvasRect Canvas dimensions (for coordinate conversion)
     */
    handleMouseMove(position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onMouseMove(position, canvasRect);
    }

    /**
     * Calls current tool's onScroll event.
     * @param deltaY Amount scrolled
     * @param position Position of mouse during scroll
     * @param canvasRect Canvas dimensions (for coordinate conversion)
     */
    handleScroll(deltaY: number, position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onScroll(deltaY, position, canvasRect);
    }

    /**
     * Calls current tool's onMouseLeave event.
     * @param event
     */
    handleMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {
        if (this.currentTool) this.currentTool.onMouseLeave(event);
    }

    /**
     * Calls current tool's onKeyUp event.
     * @param event 
     */
    handleKeyUp(event: React.KeyboardEvent<HTMLCanvasElement>) {
        if (this.currentTool) this.currentTool.onKeyUp(event);
    }
}

/**
 * Toolbar button; used to select tool from toolbar.
 * @param param0  
 * @returns 
 */
export const ToolButton = ({ tool, selected, onClick }: { tool: ToolBase, selected: boolean, onClick: React.MouseEventHandler }) => {
    const Icon = tool.icon;
    return (
        <button
            style={{
                background: selected ? 'var(--color-dark)' : 'var(--color-medium)',
                margin: 2,
                padding: 6,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            title={tool.name}
            onClick={onClick}
        >
            <Icon width={24} height={24} className='text-light' />
            {selected && (
                <span
                    style={{
                        position: 'absolute',
                        right: -2,
                        bottom: -2,
                        color: 'var(--color-light)',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        transform: 'rotate(45deg)', // <-- Add this line
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TriangleRightIcon />
                </span>
            )}
        </button>
    );
};

/**
 * Toolbar; renders all currently registered tool's buttons.
 * @param param0 
 * @returns 
 */
export const Toolbar = ({ toolSystem, onToolSelect }: { toolSystem: ToolSystem, onToolSelect: (tool: ToolBase) => void }) => {
    return (
        <div className='flex flex-row flex-wrap'>
            {toolSystem.tools.map((tool) => (
                <ToolButton
                    key={tool.name}
                    tool={tool}
                    selected={toolSystem.currentTool === tool}
                    onClick={() => onToolSelect(tool)}
                />
            ))}
        </div>
    );
};

export default ToolSystem;