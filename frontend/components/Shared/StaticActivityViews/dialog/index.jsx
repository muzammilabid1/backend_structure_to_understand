import PropTypes from 'prop-types';
import React from 'react';

import LWPButton from '../../Button/LWPButton';
import DialogWrapper from '../../DialogWrapper';
import Heading1 from '../../Typography/Heading1';

const DialogBox = ({ open, setOpen, type, children, heading, className }) => {
    return (
        <DialogWrapper
            open={open}
            setOpen={setOpen}
            className={`guess_the_animal_container_modal ${className}`}
            dialog_content_class={`top-${type}-border dialog_content`}
            contentWidth="1017px"
            subHeading={
                <LWPButton size={'large'} variant="contained" customClass="back_btn" btnText="Back" onClick={setOpen} color="inherit" />
            }>
            <div className="guess_the_animal_container_nested">
                <Heading1 customClass="mein_heading" centerText text={heading} />
                {children}
            </div>
        </DialogWrapper>
    );
};

DialogBox.propTypes = {
    open: PropTypes.bool,
    setOpen: PropTypes.func,
    readOnly: PropTypes.bool,
    type: PropTypes.string,
    children: PropTypes.element,
    heading: PropTypes.string,
    className: PropTypes.string
};

export default DialogBox;
