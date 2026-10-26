/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { DEFAULT_CHILD_IMAGE_WITH_RED_SHIRT } from '../../../shared/Constant';
import LWPButton from '../../Shared/Button/LWPButton';
import DialogWrapper from '../../Shared/DialogWrapper';
import Paragraph from './../../Shared/Typography/Paragraph';

const ChildAlreadFoundModal = ({ open, setOpen, message }) => {
    return (
        <DialogWrapper className="child_invitation_modal" open={open} setOpen={setOpen} onClose={() => {}} heading="Child already found">
            <div>
                <div className="img_contain">
                    <img src={DEFAULT_CHILD_IMAGE_WITH_RED_SHIRT} alt="..." />
                </div>
                <Paragraph>{message}</Paragraph>
            </div>
            <div className="btn_group">
                <LWPButton btnText="I understand" onClick={setOpen} />
            </div>
        </DialogWrapper>
    );
};

ChildAlreadFoundModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    message: PropTypes.string
};

export default ChildAlreadFoundModal;
