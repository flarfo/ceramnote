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

    setCurrentTool(tool: ToolBase) {
        this.currentTool = tool;
        tool.onToolSelected(this);
        // Notify the callback about tool change
        if (this.onToolChange) {
            this.onToolChange(tool);
        }
    }

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

    setCurrentImage(imageId: string) {
        this.currentImageId = imageId;
        if (!this.annotations[imageId]) {
            this.annotations[imageId] = {};
        }

        this.selectedAnnotationIDs = [];
        this.selectedHandle = null;
    }

    // Event dispatchers
    handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
        const key = event.key.toLowerCase();
        if (this.keybindMap[key]) {
            const toolName = this.keybindMap[key];
            const tool = this.tools.find(t => t.name === toolName);
            if (tool) this.setCurrentTool(tool);
        }

        if (this.currentTool) this.currentTool.onKeyDown(event);
    }

    handleMouseDown(button: number, position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onMouseDown(button, position, canvasRect);
    }

    handleMouseUp(button: number, position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onMouseUp(button, position, canvasRect);
    }

    handleMouseMove(position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onMouseMove(position, canvasRect);
    }

    handleScroll(deltaY: number, position: { x: number, y: number }, canvasRect: DOMRect) {
        if (this.currentTool) this.currentTool.onScroll(deltaY, position, canvasRect);
    }

    handleMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {
        if (this.currentTool) this.currentTool.onMouseLeave(event);
    }

    handleKeyUp(event: React.KeyboardEvent<HTMLCanvasElement>) {
        if (this.currentTool) this.currentTool.onKeyUp(event);
    }
}

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