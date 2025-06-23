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
    onMouseDown(event: { x: number, y: number }) {}
    onMouseUp(event: { x: number, y: number }) {}
    onMouseMove(event: { x: number, y: number }) {}
    onMouseLeave() {}
    onKeyDown(event: KeyboardEvent) {}
    onKeyUp(event: KeyboardEvent) {}
};