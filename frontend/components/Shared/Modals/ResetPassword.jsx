import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const ResetPasswordModal = ({ open, setOpen, link, name }) => {
    const { callSnackbar } = useContext(ThemeContext);

    return (
        <DialogWrapper className="reset_password_modal" open={open} setOpen={setOpen} heading="Reset password">
            <Paragraph customClass="title" text={`Please send ${name} this link if they’d like to reset their password:`} />
            <CopyToClipboard
                text={link}
                onCopy={() => {
                    callSnackbar('Link copied!', 'success');
                }}>
                <div className="reset_pwd_link_contain">
                    <Paragraph dataTest="reset-password-link" text={link} />
                    <span className="material-icons icon">content_copy</span>
                </div>
            </CopyToClipboard>
            <div className="btn_contain">
                <LWPButton btnText="Finish" onClick={() => setOpen(false)} />
            </div>
        </DialogWrapper>
    );
};

ResetPasswordModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    link: PropTypes.string,
    name: PropTypes.string
};

ResetPasswordModal.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default ResetPasswordModal;
