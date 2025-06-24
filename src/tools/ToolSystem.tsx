// Global tool manager, this will handle the base logic driving all classes extending Tool (defined in ../tools/custom).
// Iterate over all tools and create a list from which to render toolbar, identify current event overrides.
// Store currentTool, handle keybindings, etc.
import { ToolBase } from '@tools/Tool';
import { Annotation } from '@components/Annotation';
import AnnotationHandle from '@components/AnnotationHandle';
import RectangleTool from '@tools/custom/Rectangle';
import PanTool from '@tools/custom/Pan';
import SelectorTool from '@tools/custom/Selector';
import { TriangleRightIcon } from '@radix-ui/react-icons';
import React, { type SetStateAction } from 'react';

export class ToolSystem {
    tools: ToolBase[] = [];
    currentTool: ToolBase | null = null;
    annotations: { [imageId: string]: Annotation[] } = {};
    selectedAnnotationIDs: string[] = [];
    selectedHandle: AnnotationHandle | null = null;
    keybindMap: { [key: string]: string } = {};
    toolConfig: { [key: string]: any } = {};
    currentImageId: string = '';
    viewport: { x: number, y: number, scale: number };
    setViewport: React.Dispatch<React.SetStateAction<{ x: number, y: number, scale: number }>>;
    setSelectedAnnotationIDs: React.Dispatch<React.SetStateAction<string[]>>;

    constructor(setViewport, setSelectedAnnotationIDs) {
        // Register tools
        this.tools = [
            new RectangleTool(this),
            new PanTool(this),
            new SelectorTool(this),
        ];
        this.setViewport = setViewport;
        this.setSelectedAnnotationIDs = setSelectedAnnotationIDs;
        this.viewport = { x: 0, y: 0, scale: 1 };
        this.keybindMap = {}; // key: keybind, value: toolName
        this.toolConfig = {}; // Set config via useEffect onUpload?
    }

    setCurrentTool(tool: ToolBase) {
        this.currentTool = tool;
        tool.onToolSelected(this);
    }

    addAnnotation(annotation: any) {
        if (!this.currentImageId) return;
        if (!this.annotations[this.currentImageId]) {
            this.annotations[this.currentImageId] = [];
        }
        this.annotations[this.currentImageId].push(annotation);
    }

    selectAnnotations(annotationIDs: Annotation[]) {
        this.selectedAnnotationIDs = annotationIDs;
        this.setSelectedAnnotationIDs(annotationIDs);
    }

    setCurrentImage(imageId: string) {
        this.currentImageId = imageId;
        if (!this.annotations[imageId]) {
            this.annotations[imageId] = [];
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

    handleScroll(deltaY: number, position: {x: number, y: number}, canvasRect: DOMRect) {
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