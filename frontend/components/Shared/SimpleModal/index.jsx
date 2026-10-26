import PropTypes from 'prop-types';
import React, { useState } from 'react';

import LWPButton from '../Button/LWPButton';
import DialogBox from '../StaticActivityViews/dialog';
import Paragraph from '../Typography/Paragraph';

const SimpleModal = ({ subject, btnText }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="activity-step-modal">
            <LWPButton btnText={btnText} onClick={() => setOpen(true)} />

            {open && (
                <DialogBox
                    className="finger_space_lolly_stick_dialog_box"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    subject={subject}
                    heading={'Statement Sentence Bank'}>
                    <Paragraph>
                        The dragon roared fiercely.
                        <br /> Many tigers are hungry.
                        <br /> Cucumbers are the tastiest vegetable.
                        <br /> You should always phone Grandma on Saturday.
                        <br /> The genie will give you three wishes.
                        <br /> The princess was angry because she had lost her sword.
                        <br />
                        When fairies cry, flowers grow where their sparkly tears fall.
                        <br /> Gorillas like to eat bananas for their breakfast.
                        <br />
                        <br /> Why not make up some of your own?
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

SimpleModal.propTypes = {
    btnText: PropTypes.string,
    subject: PropTypes.string
};

export default SimpleModal;
