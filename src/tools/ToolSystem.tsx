// Global tool manager, this will handle the base logic driving all classes extending Tool (defined in ../tools/custom).
// Iterate over all tools and create a list from which to render toolbar, identify current event overrides.
// Store currentTool, handle keybindings, etc.
import { ToolBase } from './Tool';
import { Annotation } from '../components/Annotation';
import { AnnotationHandle } from '../components/AnnotationHandle';
import RectangleTool from './custom/RectangleTool';
import PanTool from './custom/PanTool';
import SelectorTool from './custom/SelectorTool';
import AssociatorTool from './custom/AssociatorTool';
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
    annotations: { [imageId: string]: { [annotationId: string]: Annotation } } = {};
    selectedAnnotationIDs: string[] = [];
    selectedHandle: AnnotationHandle | null = null;
    keybindMap: { [key: string]: string } = {};
    toolConfig: { [key: string]: any } = {};
    currentImageId: string = '';
    currentAnnotationClass: string = '';
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
            new RectangleTool(this),
            new PanTool(this),
            new SelectorTool(this),
            new AssociatorTool(this),
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
        if (!this.annotations[this.currentImageId]) {
            this.annotations[this.currentImageId] = {};
        }

        this.annotations[this.currentImageId][annotation.id] = annotation;
    }

    removeAnnotation(annotation: Annotation) {
        delete this.annotations[this.currentImageId][annotation.id];
    }

    selectAnnotations(annotationIDs: string[]) {
        this.selectedAnnotationIDs = annotationIDs;
        this.setSelectedAnnotationIDs(annotationIDs);
    }

    /**
     * Change currently loaded image (resets state, actual image handled in App.tsx)
     * @param imageId 
     */
    setCurrentImage(imageId: string) {
        this.currentImageId = imageId;
        if (!this.annotations[imageId]) {
            this.annotations[imageId] = {};
        }

        this.selectedAnnotationIDs = [];
        this.selectedHandle = null;
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