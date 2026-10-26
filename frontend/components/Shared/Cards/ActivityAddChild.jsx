/* eslint-disable @next/next/no-img-element */
import { Card, CardMedia, Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getCardBackgroundImageName, getTopicType } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import Heading1 from '../Typography/Heading1';

const ActivityAddChild = ({ customClass, childImg, headingText, popup, btnText, btnHandler, type, readOnly, onClick }) => {
    return (
        <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={4}
            style={{ pointerEvents: readOnly ? 'none' : '' }}
            className={`grid-card ${popup ? 'popup' : ''}`}>
            <Card onClick={onClick} classes={{ root: `activity-add-child-container ${customClass}` }}>
                <CardMedia
                    classes={{
                        root: `${getTopicType(type)}-bg activity-add-child-bg`
                    }}
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${getCardBackgroundImageName(type)}.png`}>
                    <img src={childImg} alt="" className="activity-add-image" />

                    <center className="activity-add-content">
                        <Heading1 dataTest="site-form-name-heading" text={headingText} centerText customClass="activity-add-heading" />
                        <LWPButton btnText={btnText} customClass="primary-btn" color="primary" onClick={btnHandler} />
                    </center>
                </CardMedia>
            </Card>
        </Grid>
    );
};

ActivityAddChild.propTypes = {
    popup: PropTypes.bool,
    customClass: PropTypes.string,
    childImg: PropTypes.string,
    headingText: PropTypes.string.isRequired,
    btnText: PropTypes.string.isRequired,
    btnHandler: PropTypes.func,
    onClick: PropTypes.func,
    type: PropTypes.string,
    readOnly: PropTypes.bool
};
ActivityAddChild.defaultProps = {
    childImg: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/building-together.png`,
    headingText: 'We did our own activity!',
    btnText: 'Tell your teacher about it'
    // type: 'general'
};

export default ActivityAddChild;
