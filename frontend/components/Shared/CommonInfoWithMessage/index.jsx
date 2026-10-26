/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Paragraph from '../Typography/Paragraph';

const CommonInfoWithMessage = ({ text, customClass }) => (
    <div className={`social_login_info ${customClass}`}>
        <div>
            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/infoIcon.png`} />
        </div>
        <Paragraph text={text} />
    </div>
);

CommonInfoWithMessage.propTypes = { text: PropTypes.string.isRequired, customClass: PropTypes.string };

export default CommonInfoWithMessage;
