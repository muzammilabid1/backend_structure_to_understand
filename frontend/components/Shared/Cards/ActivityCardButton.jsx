/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Heading1 from '../Typography/Heading1';
import LWPButton from './../Button/LWPButton';

const ActivityCardButton = ({ heading, cardImg, btnText }) => {
    return (
        <Grid xs={12} sm={12} md={12} lg={6} item className={`grid-card`}>
            <div className="activity-button-container">
                <img src={cardImg} alt="" className="activity-button-img" />
                <center className="activity-button-content">
                    <Heading1 text={heading} customClass="pb3" />
                    <LWPButton btnText={btnText} color="primary" />
                </center>
            </div>
        </Grid>
    );
};

ActivityCardButton.propTypes = {
    heading: PropTypes.string,
    btnText: PropTypes.string,
    cardImg: PropTypes.string
};
ActivityCardButton.defaultProps = {
    heading: 'We did our own activity!',
    btnText: 'Tell your teacher about it',
    cardImg: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`
};

export default ActivityCardButton;
