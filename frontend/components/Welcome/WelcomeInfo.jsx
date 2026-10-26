/* eslint-disable @next/next/no-img-element */
import { useMediaQuery, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import Heading1 from '../Shared/Typography/Heading1';
import Heading3 from '../Shared/Typography/Heading3';
import Paragraph from '../Shared/Typography/Paragraph';

const WelcomeInfo = ({
    heading,
    beforeImg,
    afterImg1,
    aftherImg2,
    aftherImg3,
    afterImg4,
    text1,
    text2,
    text3,
    text4,
    heading1,
    heading2,
    heading3,
    heading4,
    showColumnImages,
    maxWidth = 600
}) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('md'));

    const imgSrc = (filename) =>
        filename?.startsWith('/')
            ? filename
            : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${filename}`;

    const sections = [
        { heading: heading1, text: text1, img: afterImg1 },
        heading2 || text2 ? { heading: heading2, text: text2, img: aftherImg2 } : null,
        heading3 || text3 ? { heading: heading3, text: text3, img: aftherImg3 || aftherImg2 } : null,
        heading4 || text4 ? { heading: heading4, text: text4, img: afterImg4 || aftherImg3 || aftherImg2 } : null
    ].filter(Boolean);

    return (
        <div className="welcome_info" style={{ maxWidth: maxWidth }}>
            <Heading1 text={heading} centerText />

            {!smbp ? (
                showColumnImages ? (
                    <div className="welcome_info_columns">
                        {sections.map((section, idx) => (
                            <div className="column_content" key={idx}>
                                <img src={imgSrc(section.img)} alt="" />
                                <Heading3 text={section.heading} />
                                <Paragraph text={section.text} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <img src={imgSrc(beforeImg)} />
                        <div className="welcome_info_content">
                            {sections.map((section, idx) => (
                                <div className="content" key={idx}>
                                    <Heading3 text={section.heading} />
                                    <Paragraph text={section.text} />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ) : (
                <div className="welcome_info_second_content">
                    {sections.map((section, idx) => (
                        <div className="second_content" key={idx}>
                            <img src={imgSrc(section.img)} alt="" />
                            <div className="content">
                                <Heading3 text={section.heading} />
                                <Paragraph text={section.text} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

WelcomeInfo.propTypes = {
    heading: PropTypes.string,
    beforeImg: PropTypes.string,
    afterImg1: PropTypes.string,
    aftherImg2: PropTypes.string,
    aftherImg3: PropTypes.string,
    afterImg4: PropTypes.string,
    text1: PropTypes.string,
    text2: PropTypes.string,
    text3: PropTypes.string,
    text4: PropTypes.string,
    heading1: PropTypes.string,
    heading2: PropTypes.string,
    heading3: PropTypes.string,
    heading4: PropTypes.string,
    showColumnImages: PropTypes.bool,
    maxWidth: PropTypes.number
};

export default WelcomeInfo;
