import React from 'react';
import { AnnotationHandle } from './AnnotationHandle';
import { type InspectorProps } from './Inspector';

// Defines the base class for all annotation objects on the Canvas. This is rendered as an overlay on the image,
// showing the bounds for a specific annotation from which to extract data on export.
export class Annotation {
    type: string;
    name: string;
    id: string;
    bounds: {x: number, y: number}[];
    associations: Annotation[] = [];
    inspectorArgs: InspectorProps = {};
    constructor(type: string, bounds: {x: number, y: number}[], associations = [], name = 'test') {
        this.type = type;
        this.name = name;
        // Circular doubly linked list of Handles (generally defining a Polygon)
        this.bounds = bounds; // e.g., [{x, y}, ...]
        this.associations = associations; // array of Annotation ids or refs
        this.id = Annotation.generateId();

        this.inspectorArgs['position'] = bounds;
    };

    static generateId() {
        return 'ann_' + Math.random().toString(36).slice(2, 9);
    };
    
    // Add association
    addAssociation(annotation: Annotation) {
        if (!this.associations.includes(annotation)) {
            this.associations.push(annotation);
        }
    }

    // Remove association
    removeAssociation(annotation: Annotation) {
        this.associations = this.associations.filter(cur => cur.id !== annotation.id);
    }

    // NOTE: Logic for controlling the Annotation object should be handled by different tools.
    //       That way, new tools can be created with ease. Objects should expose events to the tools.
    //       For example, onHandleClicked => pass clicked handle to global tool system, so tool can update "currentHandle"
    //       and affect the currently selected handle without worrying about passing parameters.
    //       onHandleClicked => set "currentHandle", call "currentTool.onHandleClicked"

    // Save/export logic placeholder
    /*save(blob: Blob) {
        return {
            id: this.id,
            type: this.type,
            color: this.color,
            bounds: this.bounds,
            associations: this.associations
        };
    }*/
};
