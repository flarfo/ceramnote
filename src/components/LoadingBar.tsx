import { Dialog, Progress } from 'radix-ui';
import {
    Cross2Icon,
} from '@radix-ui/react-icons';
import { useState } from 'react';

interface LoadingBarProps {
    isExporting: boolean;
    index: number;
    numSteps: number;
    currentStep: string;
    subStep: string;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ isExporting, index, numSteps, currentStep, subStep }) => {
    const [isLoadingBarOpen, setIsLoadingBarOpen] = useState(isExporting);

    // Calculate progress percentage based on current index and total steps
    const progress = numSteps > 0 ? Math.round((index / numSteps) * 100) : 0;

    return (
        <Dialog.Root open={isExporting}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-medium)] border border-[var(--color-medium-light)] rounded-xl shadow-2xl p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-2">
                        <Dialog.Title className="text-lg font-semibold text-[var(--color-light)]">Exporting Annotations</Dialog.Title>
                    </div>
                    <Dialog.Description className="text-sm text-[var(--color-light)]/70 mb-4">
                        Processing <span className="font-semibold">{numSteps}</span> annotation{numSteps !== 1 ? 's' : ''} and generating export package...
                    </Dialog.Description>

                    {/* Progress Bar */}
                    <Progress.Root className="w-full h-4 bg-[var(--color-medium-light)]/60 rounded-full overflow-hidden mb-3 border border-[var(--color-medium-light)]" value={progress}>
                        <Progress.Indicator
                            className="h-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </Progress.Root>

                    <div className="flex justify-between text-xs text-[var(--color-light)]/80 mb-2">
                        <span>{progress}% Complete</span>
                        <span>
                            <span className="font-mono">{index}</span> of <span className="font-mono">{numSteps}</span>
                        </span>
                    </div>

                    {currentStep && (
                        <div className="mt-1 text-xs text-[var(--color-light)]/70">
                            {currentStep}
                        </div>
                    )}
                    {subStep && (
                        <div className="mt-1 text-xs text-green-300 font-mono truncate">
                            Processing: {subStep}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};