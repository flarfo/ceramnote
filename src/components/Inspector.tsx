import { ToolButton } from '@tools/ToolSystem'
import { SquareIcon } from '@radix-ui/react-icons';
import { useEffect } from 'react';
import ToolSystem from '../tools/ToolSystem';

export interface InspectorProps {
    bounds: {x: number, y: number}[]
};

export const Inspector = ({
    toolSystem,
    selectedAnnotationIDs
}: {
    toolSystem: ToolSystem,
    selectedAnnotationIDs: string[]
}) => {
    useEffect(() => {
        // Update state upon new selection
    }, [selectedAnnotationIDs]);

    return (
        <div className='flex flex-col flex-wrap'>
            {selectedAnnotationIDs.length == 1 ? (
                <>
                    {/** TODO: update so any selectable object has inspector props */}
                    {/** TODO: update so annotations are indexed via id key */}
                    {toolSystem.annotations[toolSystem.currentImageId][0] != null && (
                        <>
                            {Object.entries<any>(toolSystem.annotations[toolSystem.currentImageId][0].inspectorArgs).map(([key, value]) => {
                                return <span>{key}: {value.toString()}</span>
                            })}
                        </>
                    )}
                </>
            ) : (
                <>
                    {selectedAnnotationIDs.length > 1 ? 'Multiple selections' : ''}
                </>
            )}
        </div>
    );
};