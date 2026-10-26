import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import TodoTopicLists from '../../PagesContent/TodoTopicLists';
import LWPButton from '../../Shared/Button/LWPButton';
import DialogWrapper from '../../Shared/DialogWrapper';
import MathScoteWithTrophy from '../MathScoteWithTrophy';
import Heading1 from './../../Shared/Typography/Heading1';
import Paragraph from './../../Shared/Typography/Paragraph';

const images = [
    {
        imgPath: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`
    }
];

const EditChildDetailModal = ({ open, setOpen }) => {
    return (
        <DialogWrapper
            open={open}
            setOpen={setOpen}
            className="edit-child-detail-modal"
            subHeading={<LWPButton size={'large'} variant="contained" btnText="Dismiss preview" onClick={setOpen} color="inherit" />}
            secondaryBtn="Dismiss preview"
            dialogFooter
            contentWidth="1248px"
            secondaryBtnHandler={setOpen}>
            <div className="edit-child-modal-inner-content">
                <Heading1 text="Welcome, Example Child!" centerText />
                <Paragraph text="Finish activites to earn clothes, accessories, and awards." customClass="mt5" centerText />
                <MathScoteWithTrophy images={images} />

                <TodoTopicLists />
            </div>
        </DialogWrapper>
    );
};

EditChildDetailModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired
};

export default EditChildDetailModal;
