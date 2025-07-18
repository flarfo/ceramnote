import React from 'react';
import { AnnotationHandle } from './AnnotationHandle';

// Defines the base class for all annotation objects on the Canvas. This is rendered as an overlay on the image,
// showing the bounds for a specific annotation from which to extract data on export.
export class Annotation {
    [key: string]: any;
    type: string;
    name: string;
    id: string;
    tile_data: Record<string, string | number> = {
        'ColorName': '',
        'ColorL': 0,
        'ColorA': 0,
        'ColorB': 0,
        'GlazeType': '',
        'FiringTemperature': 0,
        'ChemicalComposition': '',
        'FiringType': '',
        'SoilType': '',
        'SurfaceCondition': ''
    };
    bounds: {x: number, y: number}[];
    // Inspector Arguments; these are automatically processed by the Inspector component to display
    //      and modify the annotation.
    inspectorArgs: string[] = [
        'tile_data',
        'bounds',
    ];
    constructor(type: string, bounds: {x: number, y: number}[], associations = [], name = 'test') {
        this.type = type;
        this.name = name;
        // Circular doubly linked list of Handles (generally defining a Polygon)
        this.bounds = bounds; // e.g., [{x, y}, ...]
        this.associations = associations; // array of Annotation ids or refs
        this.id = Annotation.generateId();
    };

    // Random ID used to index ToolSystem.annotations
    static generateId() {
        return 'ann_' + Math.random().toString(36).slice(2, 9);
    };

    // NOTE: Logic for controlling the Annotation object should be handled by different tools.
    //       That way, new tools can be created with ease. Objects should expose events to the tools.
    //       For example, onHandleClicked => pass clicked handle to global tool system, so tool can update "currentHandle"
    //       and affect the currently selected handle without worrying about passing parameters.
    //       onHandleClicked => set "currentHandle", call "currentTool.onHandleClicked"

    // Save/export logic placeholder
    getData() {
        return {
            ...this.tile_data
        };
    }
};
