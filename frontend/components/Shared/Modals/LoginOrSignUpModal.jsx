/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import DialogWrapper from '../../Shared/DialogWrapper';
import LWPButton from '../Button/LWPButton';
import Heading1 from '../Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';

const LoginOrSignUpModal = ({
    open,
    setOpen,
    heading,
    subHeading,
    image,
    imageAlt,
    primaryBtnText,
    primaryBtnLoading,
    primaryBtnHandler,
    isInvitation,
    className
}) => {
    return (
        <DialogWrapper
            open={open}
            setOpen={setOpen}
            className={`login-or-signup-modal ${className}`}
            contentWidth="1032px"
            secondaryBtnHandler={setOpen}
            filterBtnSecondaryText={heading === 'Check your email inbox' ? '' : 'Back'}
            filterBtnSecondaryHandler={setOpen}>
            <div className={`login-or-signup-modal-inner-content`}>
                <div className={`login-or-signup-modal-inner-content-image-container`}>
                    <img src={image} alt={imageAlt} className="login-or-signup-modal-inner-content-image" />
                </div>
                <Heading1 text={heading} centerText />
                <Paragraph text={subHeading} centerText />

                <div className="login-or-signup-modal-inner-content-button-container">
                    {isInvitation ? (
                        <div className="login-or-signup-invitation-modal">
                            <LWPButton onClick={setOpen} color="inherit" btnText="Back" size="large" customClass="primaryBtn" />
                        </div>
                    ) : (
                        <LWPButton onClick={setOpen} color="inherit" btnText="Back" size="large" customClass="secondaryBtn" />
                    )}
                    {primaryBtnText && (
                        <LWPButton
                            onClick={primaryBtnHandler}
                            loading={primaryBtnLoading}
                            btnText={primaryBtnText}
                            customClass="primaryBtn"
                            size="large"
                            dataTest={'login-or-signup-modal-primary-btn'}
                        />
                    )}
                </div>
            </div>
        </DialogWrapper>
    );
};

LoginOrSignUpModal.propTypes = {
    open: PropTypes.bool.isRequired,
    primaryBtnLoading: PropTypes.bool,
    setOpen: PropTypes.func.isRequired,
    primaryBtnHandler: PropTypes.func,
    heading: PropTypes.string,
    subHeading: PropTypes.string,
    image: PropTypes.string,
    imageAlt: PropTypes.string,
    primaryBtnText: PropTypes.string,
    isInvitation: PropTypes.bool,
    className: PropTypes.string
};

LoginOrSignUpModal.defaultProps = {
    heading: 'Log in to access this section',
    subHeading: 'Please log in to access child details section',
    image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot.png`,
    imageAlt: 'Child mathscot image',
    primaryBtnLoading: false,
    primaryBtnHandler: () => {}
};

export default LoginOrSignUpModal;
