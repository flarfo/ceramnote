import { useEffect, useState } from 'react';
import ToolSystem from '../tools/ToolSystem';
import { Annotation } from './Annotation';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Label from '@radix-ui/react-label';
import * as Separator from '@radix-ui/react-separator';
import * as Checkbox from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';

// Helper to update nested value by path
function setNestedValue(obj: any, path: (string | number)[], value: any) {
    if (path.length === 1) {
        obj[path[0]] = value;
        return;
    }

    setNestedValue(obj[path[0]], path.slice(1), value);
}

/**
 * 
 * @param path Path to current variable within object.
 * @param annotation Base annotation within which variables lie.
 * @param onChange 
 * @returns 
 */
const getInspectorField = (
    path: (string | number)[],
    annotation: Annotation,
    onChange: (path: (string | number)[], value: any) => void
) => {
    // Traverse to value
    let value: any = annotation;
    for (const key of path) value = value[key];

    // Render text field for strings
    if (typeof value === 'string') {
        return (
            <div className="relative inline-flex px-3 py-2 text-xs bg-[var(--color-dark)] border border-[var(--color-medium-light)] rounded-md text-[var(--color-light)]">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(path, e.target.value)}
                />
            </div>
        );
    }

    // Render number text field for numbers (same as string, but with casting)
    if (typeof value === 'number') {
        return (
            <div className="relative inline-flex px-3 py-2 text-xs bg-[var(--color-dark)] border border-[var(--color-medium-light)] rounded-md text-[var(--color-light)]">
                <input
                    type="number"
                    value={value}
                    onChange={e => onChange(path, Number(e.target.value))}
                />
            </div>
        );
    }

    // Render checkbox for bools
    if (typeof value === 'boolean') {
        return (
            <div className="flex items-center space-x-2">
                <Checkbox.Root
                    checked={value}
                    onCheckedChange={(checked) => onChange(path, checked === true)}
                    className="flex h-4 w-4 items-center justify-center rounded border border-[var(--color-medium-light)] bg-[var(--color-medium)] focus:outline-none"
                >
                    <Checkbox.Indicator className="text-[var(--color-dark)]">
                        <CheckIcon width={12} height={12} />
                    </Checkbox.Indicator>
                </Checkbox.Root>
                <Label.Root className="text-xs text-[var(--color-light)] cursor-pointer select-none">
                    {value ? 'True' : 'False'}
                </Label.Root>
            </div>
        );
    }

    // Nested rendering for arrays
    if (Array.isArray(value)) {
        return (
            <div className="pl-4 border-l-2 border-[var(--color-medium-light)] ml-1 space-y-2">
                {value.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                        <Label.Root className="text-xs text-[var(--color-light)] font-mono font-medium">
                            [{idx}]
                        </Label.Root>
                        <div>
                            {getInspectorField([...path, idx], annotation, onChange)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Nested rendering for objects
    if (typeof value === 'object' && value !== null) {
        return (
            <div className="pl-4 border-l-2 border-[var(--color-medium-light)] ml-1 space-y-2">
                {Object.entries(value).map(([k, v]) => (
                    <div key={k} className="space-y-1">
                        <Label.Root className="text-xs text-[var(--color-light)] font-mono font-medium">
                            {k}
                        </Label.Root>
                        <div>
                            {getInspectorField([...path, k], annotation, onChange)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="px-2 py-1 text-xs text-[var(--color-light)] italic font-mono bg-[var(--color-medium)] border border-[var(--color-medium-light)] rounded">
            {String(value)}
        </div>
    );
};

/**
 * Inspector component; allows for dynamic, direct access of annotation objects via objects 
 * in Annotation.inspectorArgs
  */
export const Inspector = ({
    toolSystem,
    selectedAnnotationIDs
}: {
    toolSystem: ToolSystem,
    selectedAnnotationIDs: string[]
}) => {
    // Dummy state to force re-render on change
    const [_, setVersion] = useState(0);

    const handleFieldChange = (path: (string|number)[], value: any) => {
        const ann = toolSystem.annotations[toolSystem.currentImageIndex][selectedAnnotationIDs[0]];
        setNestedValue(ann, path, value);
        setVersion(v => v + 1); // Force re-render
    };

    useEffect(() => {
        // Update state upon new selection
    }, [selectedAnnotationIDs]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-medium)] border-t border-[var(--color-medium-light)]">
            <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--color-medium-light)]">
                <h3 className="text-xs font-medium text-[var(--color-light)] uppercase tracking-wide">Inspector</h3>
            </div>
            
            <div className="flex-1 min-h-0 m-2">
                <ScrollArea.Root className="h-full">
                    <ScrollArea.Viewport className="w-full h-full">
                        <div className="px-1">
                            {selectedAnnotationIDs.length === 1 ? (
                                <>
                                    {toolSystem.annotations[toolSystem.currentImageIndex][selectedAnnotationIDs[0]] != null ? (
                                        <div className="space-y-4">
                                            {toolSystem.annotations[toolSystem.currentImageIndex][selectedAnnotationIDs[0]].inspectorArgs.map((key: string, index: number) => (
                                                <div key={index} className="space-y-2">
                                                    <Label.Root className="text-xs font-semibold text-[var(--color-light)] block tracking-wide">
                                                        {key}
                                                    </Label.Root>
                                                    <div>
                                                        {getInspectorField([key], toolSystem.annotations[toolSystem.currentImageIndex][selectedAnnotationIDs[0]], handleFieldChange)}
                                                    </div>
                                                    {index < toolSystem.annotations[toolSystem.currentImageIndex][selectedAnnotationIDs[0]].inspectorArgs.length - 1 && (
                                                        <Separator.Root className="bg-[var(--color-medium-light)]/30 h-px w-full my-3" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-[var(--color-light)]/60 text-xs py-8">
                                            <div className="mb-2">No annotation data available</div>
                                            <div className="text-xs opacity-50">
                                                This annotation may not have editable properties
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : selectedAnnotationIDs.length > 1 ? (
                                <div className="text-center text-[var(--color-light)]/60 text-xs py-8">
                                    <div className="mb-2">Multiple annotations selected</div>
                                    <div className="text-xs opacity-50">
                                        Select a single annotation to edit properties
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-[var(--color-light)]/60 text-xs py-8">
                                    <div className="mb-2">No annotations selected</div>
                                    <div className="text-xs opacity-50">
                                        Select an annotation to view and edit its properties
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar
                        className="flex select-none touch-none p-0.5 bg-[var(--color-medium)] transition-colors duration-200 ease-out hover:bg-[var(--color-medium-light)] data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2"
                        orientation="vertical"
                    >
                        <ScrollArea.Thumb className="flex-1 bg-[var(--color-light)] opacity-50 rounded-full relative hover:opacity-70 transition-opacity before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[32px] before:min-h-[32px]" />
                    </ScrollArea.Scrollbar>
                    <ScrollArea.Corner className="bg-[var(--color-medium)]" />
                </ScrollArea.Root>
            </div>
        </div>
    );
};