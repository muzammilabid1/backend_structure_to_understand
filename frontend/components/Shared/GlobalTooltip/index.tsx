/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import React from 'react';
import Joyride, { TooltipRenderProps } from 'react-joyride';

import { useTooltip } from '../../../context/TooltipContext';
import LWPButton from '../Button/LWPButton';
import Paragraph from '../Typography/Paragraph';

const CustomTooltip = ({ step, primaryProps }: TooltipRenderProps) => {
    return (
        <Grid
            width={350}
            padding={3}
            gap={1}
            display={'flex'}
            className="feedback_tooltip_text"
            justifyContent={'center'}
            borderRadius={4}
            alignItems={'flex-start'}>
            {step?.data?.imageUrl && <img src={step?.data?.imageUrl} alt="switch between" width={58} />}
            <Grid>
                <Paragraph dataTest="feature-tooltip-text" text={step?.content} />
                <br />
                <Grid container alignItems={'center'} justifyContent={step?.data?.totalSteps > 1 ? 'space-between' : 'flex-end'}>
                    {step?.data?.totalSteps > 1 && <Paragraph text={`${step?.data?.currentStep}/${step?.data?.totalSteps}`} />}
                    <Grid>
                        <LWPButton
                            variant="text"
                            id="feature-tooltip-button"
                            btnText={step?.data?.buttonText}
                            onClick={primaryProps.onClick}
                            color="inherit"
                            dataTest="tooltip-update-button"
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

const GlobalTooltip = React.memo(() => {
    const { joyrideSteps, handleJoyrideCallback, run, stepIndex, isPaused } = useTooltip();

    return (
        <Joyride
            steps={joyrideSteps}
            continuous
            showProgress
            // Held while a one-time modal is open, and picks up at the same step once it closes.
            run={run && !isPaused}
            hideBackButton
            disableOverlayClose
            scrollToFirstStep
            hideCloseButton
            scrollOffset={100}
            stepIndex={stepIndex} // Ensure correct order
            tooltipComponent={CustomTooltip}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000
                },
                overlay: {
                    minHeight: '100vh'
                }
            }}
        />
    );
});

GlobalTooltip.displayName = 'GlobalTooltip';

export default GlobalTooltip;
