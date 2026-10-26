import { gql, useMutation, useQuery } from '@apollo/client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ACTIONS, CallBackProps, EVENTS, Step } from 'react-joyride';

import { logTooltipAction } from '../graphQl/mutations';
import { handleErrorSnackbar, ThemeContext } from '../shared/Services/handler';
import { IStaticLwpFeatureTooltip } from '../types/entities/IStaticLwpFeatureTooltip';

// GraphQL Queries
const GET_UNSEEN_FEATURE_TOOLTIPS = gql`
    query getUnseenFeatureTooltips {
        getUnseenFeatureTooltips {
            id
            targetId
            message
            order
            imageUrl
        }
    }
`;

interface TooltipContextProps {
    joyrideSteps: Step[];
    run: boolean;
    handleJoyrideCallback: (data: CallBackProps) => void;
    stepIndex: number;
    isTooltipActive: boolean;
    /** True while something that must be read on its own, such as a one-time modal, is open. */
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
}

const TooltipContext = createContext<TooltipContextProps | undefined>(undefined);

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, callSnackbar } = useContext(ThemeContext);
    const [joyrideSteps, setJoyrideSteps] = useState<Step[]>([]);
    const [run, setRun] = useState<boolean>(false);
    const [unseenTooltips, setUnseenTooltips] = useState<IStaticLwpFeatureTooltip[]>([]);
    const [seenTooltipIds, setSeenTooltipIds] = useState<string[]>([]);
    const [stepIndex, setStepIndex] = useState<number>(0);
    const [isTooltipActive, setIsTooltipActive] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);

    const { data: tooltipData, error: tooltipError } = useQuery<{ getUnseenFeatureTooltips: IStaticLwpFeatureTooltip[] }>(
        GET_UNSEEN_FEATURE_TOOLTIPS,
        {
            fetchPolicy: 'cache-first',
            ssr: false,
            skip: !token?.sub
        }
    );

    useEffect(() => {
        if (tooltipData?.getUnseenFeatureTooltips) {
            setUnseenTooltips(tooltipData.getUnseenFeatureTooltips);
        }
    }, [tooltipData]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, tooltipError);
    }, [tooltipError]);

    const [markTooltipAsSeen] = useMutation(logTooltipAction);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { type, action, index } = data;
        const tooltipId = data?.step?.data?.tooltipId;

        switch (type) {
            case EVENTS.STEP_AFTER:
                if (action === ACTIONS.NEXT && tooltipId) {
                    setSeenTooltipIds((prev) => [...prev, tooltipId]);
                    markTooltipAsSeen({ variables: { tooltipId } });
                    setUnseenTooltips((prev) => prev.filter((t) => t.id !== tooltipId));

                    const sideBar = document.querySelector('.side-drawer-open .MuiDrawer-paper') as HTMLElement;

                    // If it's the last step, end Joyride
                    if (index + 1 >= joyrideSteps.length) {
                        setRun(false);
                        setIsTooltipActive(false);
                        setJoyrideSteps([]);
                        setStepIndex(0);

                        if (sideBar) sideBar.style.overflowY = 'auto';
                    } else {
                        setStepIndex(index + 1);
                        if (sideBar) sideBar.style.overflowY = 'hidden';
                    }
                }

                break;

            case EVENTS.TOUR_END:
                setUnseenTooltips((prev) => prev.filter((tooltip) => !seenTooltipIds.includes(tooltip.id)));
                setJoyrideSteps([]);
                setRun(false);
                setIsTooltipActive(false);
                setStepIndex(0); // Reset index when tour ends
                break;
        }
    };

    const checkVisibleSteps = () => {
        if (unseenTooltips?.length > 0) {
            const visibleSteps = unseenTooltips.filter((step) => document.getElementById(step?.targetId));

            if (visibleSteps.length > 0) {
                setIsTooltipActive(true);
                const steps: Step[] = visibleSteps.map((tooltip, index) => ({
                    target: `#${tooltip.targetId}`,
                    content: tooltip.message,
                    placement: 'bottom',
                    disableBeacon: true,
                    data: {
                        tooltipId: tooltip.id,
                        imageUrl: tooltip?.imageUrl,
                        totalSteps: visibleSteps.length,
                        currentStep: index + 1,
                        buttonText: index === visibleSteps.length - 1 ? 'Got it' : `Next`
                    }
                }));

                // Check if all visibleSteps exist in joyrideSteps
                const allStepsExist = visibleSteps.every((step) => joyrideSteps.some((js) => js.target === `#${step.targetId}`));

                if (run && allStepsExist) return;

                /**
                 * If Joyride is already running and the first step in `joyrideSteps` does not match
                 * the first step in `steps`, then stop Joyride and update `joyrideSteps` to match `steps`.
                 */
                if (run && joyrideSteps?.length > 0 && joyrideSteps[0]?.target !== steps[0]?.target) {
                    setRun(false);
                }

                setTimeout(() => {
                    setJoyrideSteps(steps);
                    setRun(true);
                }, 300); // 300ms delay to ensure proper positioning
            } else {
                setRun(false);
            }
        }
    };

    useEffect(() => {
        // Initial check
        checkVisibleSteps();

        // Create a mutation observer to monitor changes to the DOM
        const observer = new MutationObserver(() => {
            checkVisibleSteps();
        });

        // Start observing the document body for changes
        observer.observe(document.body, { childList: true, subtree: true });

        // Cleanup the observer on component unmount
        return () => {
            observer.disconnect();
        };
    }, [unseenTooltips, run, stepIndex]);

    const contextValue = useMemo(
        () => ({
            joyrideSteps,
            handleJoyrideCallback,
            run,
            stepIndex,
            isTooltipActive,
            isPaused,
            setIsPaused
        }),
        [joyrideSteps, handleJoyrideCallback, run, stepIndex, isTooltipActive, isPaused]
    );

    return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>;
};

export const useTooltip = () => {
    const context = useContext(TooltipContext);

    if (!context) {
        throw new Error('useTooltip must be used within a TooltipProvider');
    }

    return context;
};
