import type { IconProps } from '@radix-ui/react-icons/dist/types';
import ToolSystem from './ToolSystem';
import type { ComponentType } from 'react';

// Tool base class
export class ToolBase {
    name: string;
    icon: ComponentType<IconProps>
    keybind: string | null;
    toolSystem: ToolSystem;

    constructor(toolSystem: ToolSystem, name: string, icon: ComponentType<IconProps>, keybind: string | null = null) {
        this.name = name;
        this.icon = icon;
        this.keybind = keybind;
        this.toolSystem = toolSystem;
    }

    // Called when this tool is selected
    onToolSelected(toolSystem: ToolSystem) {}

    // Event hooks (to be overridden by subclasses)
    // TODO: fix params
    onMouseDown(button: number, position: { x: number, y: number }, canvasRect: DOMRect) {}
    onMouseUp(button: number, position: { x: number, y: number }, canvasRect: DOMRect) {}
    onMouseMove(position: { x: number, y: number }, canvasRect: DOMRect) {}
    onMouseLeave(event: React.MouseEvent<HTMLCanvasElement>) {}
    onKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {}
    onKeyUp(event: React.KeyboardEvent<HTMLCanvasElement>) {}
    onScroll(deltaY: number, position: {x: number, y: number}, canvasRect: DOMRect) {}
};