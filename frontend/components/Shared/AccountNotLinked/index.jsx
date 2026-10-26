import { Avatar, Paper } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const CommonSocialAccountInformation = ({ avatarIcon, avatarAlt, socialIcon, socialAlt, accountName, accountEmail, variant }) => {
    return (
        <div className={`common_social_account_container`}>
            <Paper elevation={3}>
                <div className="common_social_account_info">
                    {socialIcon && (
                        <div className="common_social_account_social">
                            <Avatar alt={socialAlt} src={socialIcon} variant={variant} />
                        </div>
                    )}
                    <div className="common_social_account_name_and_info">
                        <Heading3 text={accountName} />
                        <Paragraph text={accountEmail} />
                    </div>
                    {avatarIcon && (
                        <div className="common_social_account_avatar">
                            <Avatar alt={avatarAlt} src={avatarIcon} />
                        </div>
                    )}
                </div>
            </Paper>
        </div>
    );
};

CommonSocialAccountInformation.propTypes = {
    avatarIcon: PropTypes.string,
    avatarAlt: PropTypes.string,
    socialIcon: PropTypes.string,
    socialAlt: PropTypes.string,
    accountName: PropTypes.string,
    accountEmail: PropTypes.string,
    variant: PropTypes.string
};

export default CommonSocialAccountInformation;
