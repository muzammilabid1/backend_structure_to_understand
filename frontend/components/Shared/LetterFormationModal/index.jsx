import PropTypes from 'prop-types';
import React, { useState } from 'react';

import sharedJson from '../../../shared/json/index.json';
import DialogBox from '../StaticActivityViews/dialog';
import LWPButton from './../Button/LWPButton';
import DownloadAlphabetsPDF from './../downloadAlphabetsPDF';

const LetterFormationModal = ({ subject }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="activity-step-modal">
            <LWPButton btnText="Letter Formation" onClick={() => setOpen(true)} />

            {open && (
                <DialogBox
                    className="finger_space_lolly_stick_dialog_box"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    subject={subject}
                    heading={'Letter Formation'}>
                    <DownloadAlphabetsPDF
                        array={[...sharedJson.alphabets, { text: <br /> }].concat(
                            sharedJson?.alphabets.map((i) => ({ text: i.text.toUpperCase() }))
                        )}
                    />
                </DialogBox>
            )}
        </div>
    );
};

LetterFormationModal.propTypes = {
    btnText: PropTypes.string,
    subject: PropTypes.string
};

export default LetterFormationModal;
