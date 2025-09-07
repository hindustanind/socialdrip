import React, { useState, useEffect, useRef } from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import Button from '../shared/Button';

declare global {
  interface Window {
    scrollLockCount?: number;
  }
}

// A friendly hand icon to point things out
// FIX: The hand icon is now a proper hand and can be set to wave or point.
// FIX: Add `style` prop to allow for dynamic positioning.
const HandIcon: React.FC<{ className?: string; waving?: boolean; style?: React.CSSProperties }> = ({ className, waving, style }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-12 h-12 text-yellow-300 drop-shadow-lg ${waving ? 'animate-hand-wave' : 'animate-hand-point'} ${className}`}
        style={style}
    >
        <path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" />
        <path d="M11 8a1.5 1.5 0 0 1 3 0v-3.5a1.5 1.5 0 0 1 3 0v12.5a6 6 0 0 1-6 6h-2a5 5 0 0 1-5-5l-.5-3a2 2 0 0 1 2-2h1" />
        <path d="M18.5 13.5a1 1 0 0 1 1 1c.214 2.227-1.186 4.5-3.5 4.5-2.033 0-3.5-1.78-3.5-4a1 1 0 1 1 2 0a2 2 0 1 0 4 0z" />
    </svg>
);


export const TutorialGuide: React.FC = () => {
    const { isTutorialActive, currentStep, nextStep, stopTutorial } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isTutorialActive) return;

        window.scrollLockCount = (window.scrollLockCount || 0) + 1;
        if (window.scrollLockCount === 1) document.body.classList.add('no-scroll');
        
        const allTimers: number[] = [];

        if (currentStep) {
            setIsVisible(false); // Hide previous step before moving to next

            const processNextStep = () => {
                 if (!currentStep.elementId) { // Handle centered modal case
                    setTargetRect(null);
                    setIsVisible(true);
                    return;
                }
                const element = document.querySelector(`[data-tutorial-id="${currentStep.elementId}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    allTimers.push(window.setTimeout(() => {
                        setTargetRect(element.getBoundingClientRect());
                        setIsVisible(true);
                    }, 400)); // Wait for scroll
                } else {
                    allTimers.push(window.setTimeout(processNextStep, 150)); // Retry
                }
            };
            allTimers.push(window.setTimeout(processNextStep, 450)); // Initial delay for transitions
        } else {
            setIsVisible(false);
            allTimers.push(window.setTimeout(() => setTargetRect(null), 500));
        }

        return () => {
            allTimers.forEach(window.clearTimeout);
            window.scrollLockCount = Math.max(0, (window.scrollLockCount || 0) - 1);
            if (window.scrollLockCount === 0) document.body.classList.remove('no-scroll');
        };
    }, [currentStep, isTutorialActive]);
    
    if (!isTutorialActive || !currentStep) {
        return null;
    }

    // --- FINAL STEP MODAL ---
    if (!targetRect && !currentStep.elementId) {
        return (
            <div className={`fixed inset-0 z-[100] bg-black/80 flex items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div
                    ref={tooltipRef}
                    className={`bg-[#1a0a37]/90 backdrop-blur-md border border-[#00f2ff]/50 rounded-lg p-6 w-96 shadow-2xl shadow-[#00f2ff]/30 text-center transition-all duration-500 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                >
                    <HandIcon waving className="mx-auto" />
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff] my-3">{currentStep.title}</h3>
                    <p className="text-gray-300 text-base mb-6">{currentStep.content}</p>
                    <Button onClick={stopTutorial} className="px-6 py-2 text-base">Let's Go!</Button>
                </div>
            </div>
        );
    }

    if (!targetRect) return null; // Wait for element to be found

    // --- TOOLTIP & HIGHLIGHT LOGIC ---
    const getTooltipPosition = () => {
        if (!tooltipRef.current) return { top: 0, left: 0 };
        const tooltipHeight = tooltipRef.current.offsetHeight;
        const tooltipWidth = tooltipRef.current.offsetWidth;
        const spacing = 15;
        const vw = window.innerWidth;
        
        let pos = { top: 0, left: 0 };
        const position = currentStep?.position || 'bottom';

        switch (position) {
            case 'top':
                pos = { top: targetRect.top - tooltipHeight - spacing, left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2 };
                break;
            case 'right':
                pos = { top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2, left: targetRect.right + spacing };
                break;
            case 'left':
                pos = { top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2, left: targetRect.left - tooltipWidth - spacing };
                break;
            default: // bottom
                pos = { top: targetRect.bottom + spacing, left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2 };
                break;
        }

        pos.left = Math.max(spacing, Math.min(pos.left, vw - tooltipWidth - spacing));
        return pos;
    };
    
    // FIX: New logic to position the hand relative to the target element.
    const getHandPosition = () => {
        if (!targetRect) return {};
        const spacing = 5;
        const handSize = 48; // Corresponds to w-12/h-12
        
        let pos = { top: 0, left: 0, transform: 'rotate(0deg)'};
        const position = currentStep?.position || 'bottom';

        switch(position) {
            case 'top':
                pos.top = targetRect.top - handSize + spacing;
                pos.left = targetRect.left + targetRect.width / 2;
                pos.transform = 'rotate(135deg) translateX(-50%)';
                break;
            case 'right':
                pos.top = targetRect.top + targetRect.height / 2 - handSize / 2;
                pos.left = targetRect.right;
                pos.transform = 'rotate(225deg)';
                break;
            case 'left':
                pos.top = targetRect.top + targetRect.height / 2 - handSize / 2;
                pos.left = targetRect.left - handSize;
                pos.transform = 'rotate(45deg)';
                break;
            default: // bottom
                pos.top = targetRect.bottom;
                pos.left = targetRect.left + targetRect.width / 2;
                pos.transform = 'rotate(-45deg) translateX(-50%)';
                break;
        }
        return pos;
    };

    const tooltipPos = getTooltipPosition();
    const handPos = getHandPosition();


    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <div
                className="absolute border-4 border-dashed border-[#00f2ff] rounded-lg tutorial-highlight"
                style={{
                    top: targetRect.top - 8,
                    left: targetRect.left - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                    opacity: isVisible ? 1 : 0,
                }}
            />

            <HandIcon
                className="absolute"
                style={{
                    ...handPos,
                    opacity: isVisible ? 1 : 0,
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />

            <div
                ref={tooltipRef}
                className="absolute bg-[#1a0a37]/90 backdrop-blur-md border border-[#00f2ff]/50 rounded-lg p-4 w-80 shadow-2xl shadow-[#00f2ff]/30 pointer-events-auto"
                style={{
                    ...tooltipPos,
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff] mb-2">{currentStep.title}</h3>
                <p className="text-gray-300 text-sm mb-4">{currentStep.content}</p>
                <div className="flex justify-between items-center">
                    <Button onClick={stopTutorial} variant="secondary" className="px-3 py-1 text-xs">Skip Tour</Button>
                    <Button onClick={nextStep} className="px-4 py-1 text-sm">Next</Button>
                </div>
            </div>
        </div>
    );
};