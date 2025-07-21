import React, { useEffect } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Annotation } from './Annotation';
import ToolSystem from '../tools/ToolSystem';

interface AnnotationScrollbarProps {
    imageFiles: FileList | null;
    currentImageIndex: number;
    annotations: { [imageIndex: number]: { [annotationId: string]: Annotation } };
    onImageChange: (index: number) => void;
}

export const AnnotationScrollbar: React.FC<AnnotationScrollbarProps> = ({
    imageFiles,
    currentImageIndex,
    annotations,
    onImageChange,
}) => {
    useEffect(() => {

    }, [annotations]);

    if (!imageFiles || imageFiles.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center text-[var(--color-light)]/60 text-xs">
                    <div className="mb-2">No images loaded</div>
                    <div className="text-xs opacity-50">
                        Upload images to see navigation
                    </div>
                </div>
            </div>
        );
    }

    // Get annotation counts for each image
    const getAnnotationCount = (imageIndex: number): number => {
        if (!annotations[imageIndex]) return 0;

        return Object.keys(annotations[imageIndex]).length;
    };

    // Calculate opacity based on annotation count (0-30+ annotations)
    const getOpacityFromCount = (count: number): number => {
        if (count === 0) return 0;
        // Scale from 0.2 to 1.0 based on count (max at 30 annotations)
        return Math.min(0.2 + (count / 30) * 0.8, 1.0);
    };

    // Get color based on annotation density
    const getIndicatorColor = (count: number, isActive: boolean): string => {
        const opacity = getOpacityFromCount(count);

        if (isActive) {
            return `rgba(59, 130, 246, ${Math.max(opacity, 0.8)})`; // Blue for active
        }

        if (count === 0) {
            return 'rgba(156, 163, 175, 0.3)'; // Gray for no annotations
        }

        return `rgba(34, 197, 94, ${opacity})`; // Green with varying opacity
    };

    const imageArray = Array.from(imageFiles);

    return (
        <div className="h-full flex flex-col bg-[var(--color-medium)] border-l border-[var(--color-medium-light)]">
            {/* Header */}
            <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--color-medium-light)]">
                <h3 className="text-xs font-medium text-[var(--color-light)] uppercase tracking-wide">
                    Images ({imageArray.length})
                </h3>
            </div>

            {/* Scrollable image indicators */}
            <div className="flex-1 min-h-0 p-2 flex flex-col mb-5">
                <ScrollArea.Root className="h-full flex-1">
                    <ScrollArea.Viewport className="h-full w-full">
                        <div className="space-y-1">
                            {imageArray.map((file, index) => {
                                const annotationCount = getAnnotationCount(index);
                                const isActive = index === currentImageIndex;
                                const indicatorColor = getIndicatorColor(annotationCount, isActive);

                                return (
                                    <div
                                        key={index}
                                        className={`
                                            relative group cursor-pointer rounded-md transition-all duration-200
                                            ${isActive
                                                ? 'bg-[var(--color-medium-light)] shadow-sm'
                                                : 'hover:bg-[var(--color-medium-light)]/50'
                                            }
                                        `}
                                        onClick={() => onImageChange(index)}
                                    >
                                        {/* Main indicator bar */}
                                        <div className="flex items-center p-2 gap-3">
                                            {/* Visual indicator circle */}
                                            <div
                                                className="w-3 h-3 rounded-full border transition-all duration-200"
                                                style={{
                                                    backgroundColor: indicatorColor,
                                                    borderColor: isActive ? '#3b82f6' : 'var(--color-medium-light)'
                                                }}
                                            />

                                            {/* Image index and annotation count bars */}
                                            <div className="flex-1 flex items-center justify-between">
                                                <span className={`text-xs font-mono ${isActive ? 'text-[var(--color-light)]' : 'text-[var(--color-light)]/70'}`}>
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>

                                                {/* Annotation density bars */}
                                                <div className="flex gap-0.5">
                                                    {Array.from({ length: Math.min(5, Math.ceil(annotationCount / 6)) }).map((_, barIndex) => (
                                                        <div
                                                            key={barIndex}
                                                            className="w-0.5 h-3 rounded-full"
                                                            style={{
                                                                backgroundColor: annotationCount > 0
                                                                    ? `rgba(34, 197, 94, ${0.4 + (barIndex * 0.15)})`
                                                                    : 'transparent'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tooltip on hover */}
                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                            <div className="bg-[var(--color-dark)] text-[var(--color-light)] text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                <div className="font-medium">{file.name}</div>
                                                <div className="text-[var(--color-light)]/70">
                                                    {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Active indicator line */}
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea.Viewport>

                    <ScrollArea.Scrollbar
                        className="flex select-none touch-none p-0.5 bg-[var(--color-medium)] transition-colors duration-200 ease-out hover:bg-[var(--color-medium-light)] data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2"
                        orientation="vertical"
                    >
                        <ScrollArea.Thumb className="flex-1 bg-[var(--color-light)] opacity-50 rounded-full relative hover:opacity-70 transition-opacity" />
                    </ScrollArea.Scrollbar>

                    <ScrollArea.Corner className="bg-[var(--color-medium)]" />
                </ScrollArea.Root>
            </div>
        </div>
    );
};
