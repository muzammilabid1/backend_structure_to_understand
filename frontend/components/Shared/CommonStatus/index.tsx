/* eslint-disable @next/next/no-img-element */
import React, { ReactNode } from 'react';

import LWPButton from '../Button/LWPButton';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

interface CommonStatusProps {
    children?: ReactNode;
    heading?: string;
    loading?: boolean;
    subHeading?: string;
    headingClass?: string;
    subHeadingClass?: string;
    buttonText?: string;
    onClick?: () => void;
    image?: string;
    image1?: string;
    image2?: string;
    imageAlt?: string;
    className?: string;
    dataTest?: string;
    buttonStartIcon?: string;
    subHeadingDataTest?: string;
    headingDataTest?: string;
    buttonDataTest?: string;
}

const CommonStatus = ({
    heading,
    headingDataTest,
    subHeading,
    subHeadingDataTest,
    headingClass,
    subHeadingClass,
    buttonStartIcon,
    buttonText,
    loading,
    onClick = () => {},
    image = '',
    image1 = '',
    image2 = '',
    imageAlt = '',
    className = '',
    children,
    dataTest,
    buttonDataTest
}: CommonStatusProps) => {
    return (
        <div className={`common_status_container ${className}`} data-test={dataTest}>
            <div className={`common_status_img`}>
                {image && <img src={image} alt={imageAlt} className="common_status_container_image" />}
                {image1 && <img src={image1} alt={imageAlt} className="common_status_container_image" />}
            </div>
            {heading && <Heading1 text={heading} dataTest={headingDataTest} centerText customClass={headingClass} />}
            {subHeading && <Paragraph dataTest={subHeadingDataTest} text={subHeading} centerText customClass={subHeadingClass} />}
            {image2 && (
                <div className={`common_status_img`}>
                    {image2 && <img src={image2} alt={imageAlt} className="common_status_container_image" />}
                </div>
            )}
            {buttonText && (
                <LWPButton
                    startIcon={buttonStartIcon}
                    onClick={onClick}
                    loading={loading}
                    btnText={buttonText}
                    size="large"
                    dataTest={buttonDataTest}
                />
            )}
            {children}
        </div>
    );
};

export default CommonStatus;
