/* eslint-disable @next/next/no-img-element */
import MobileStepper from '@mui/material/MobileStepper';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import SwipeableViews from 'react-swipeable-views';

import Heading1 from './../../Shared/Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';

const MobileImgStepper = ({ sliderImg }) => {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const maxSteps = sliderImg?.length;

    const handleStepChange = (step) => {
        setActiveStep(step);
    };

    return (
        <div className="mobile-stepper-container">
            <SwipeableViews
                axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
                index={activeStep}
                onChangeIndex={handleStepChange}
                enableMouseEvents>
                {sliderImg?.map((logo, index) => (
                    <div key={index} className="stepper-img-container">
                        {Math.abs(activeStep - index) <= 2 ? (
                            <>
                                <img className="stepper-img" src={logo.image} alt={logo.alt || 'steper img'} />
                                {logo.title && <Heading1 centerText text={logo.title} />}
                                {logo.subTitle && <Paragraph centerText text={logo.subTitle} />}
                            </>
                        ) : null}
                    </div>
                ))}
            </SwipeableViews>
            <MobileStepper steps={maxSteps} position="static" activeStep={activeStep} />
        </div>
    );
};

MobileImgStepper.propTypes = { sliderImg: PropTypes.array };

export default MobileImgStepper;
