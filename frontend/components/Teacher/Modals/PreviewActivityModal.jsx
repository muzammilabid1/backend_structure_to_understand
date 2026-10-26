/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from './../../Shared/Button/LWPButton';
import DialogWrapper from './../../Shared/DialogWrapper';
import Heading1 from './../../Shared/Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';

const PreviewActivityModal = ({ open, setOpen }) => {
    return (
        <DialogWrapper
            open={open}
            setOpen={setOpen}
            subHeading={<LWPButton size={'large'} variant="contained" btnText="Dismiss preview" onClick={setOpen} color="inherit" />}
            secondaryBtn="Dismiss preview"
            contentWidth="1248px"
            dialogFooter
            secondaryBtnHandler={setOpen}>
            <div className="preview-activity-modal-inner-content">
                <Heading1 text="Counting" centerText />
                <Paragraph
                    text="You are going to find halves and quarters of the shapes below. You can download the shape template at the end of this activity page."
                    customClass="mt5"
                />
                <div className="preview-activity-img">
                    <p className="mb8">
                        Shade in <strong>1/4</strong> and <strong>1/2</strong> of each shape.
                    </p>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/ShapesActivity-1.png`}
                        alt=""
                        className="activity-img"
                    />
                    <p className="mb8">
                        Shade in <strong>1/4</strong> and <strong>1/2</strong> of each shape.
                    </p>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/ShapesActivity-1.png`}
                        alt=""
                        className="activity-img"
                    />
                </div>
            </div>
        </DialogWrapper>
    );
};

PreviewActivityModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired
};

export default PreviewActivityModal;
