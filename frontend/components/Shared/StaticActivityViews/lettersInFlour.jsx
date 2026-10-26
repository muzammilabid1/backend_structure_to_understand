/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import DownloadAlphabetsPDF from '../downloadAlphabetsPDF';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const LettersInFlour = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday improveIt">
            <Heading1 centerText text="Letters in Flour" />

            <Divider customClass="my5" />

            <Paragraph>For this activity you will need:</Paragraph>
            <ul>
                <li>A tray (a flat plate will be fine, plain coloured works really well)</li>
                <li>Some flour (you could also use salt or sand or another powder)</li>
                <li>Your finger (or a cotton bud if you don’t like touching the flour)</li>
                <li>Letter formation instructions (click the button below to view)</li>
            </ul>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Letter formation" color="inherit" />
            </div>

            <Divider customClass="mb5" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />

            <br />
            <br />

            <ol>
                <li>Spread the flour on your tray.</li>
                <li>
                    Player 1 writes a letter using their finger (it can be{' '}
                    <div className="pop_over">
                        <CommonPopOver hover text="upper-case" childrenClass="typography">
                            Upper-case letters: Also known as capital letters, e.g. B Q or M.
                        </CommonPopOver>
                    </div>{' '}
                    or{' '}
                    <div className="pop_over">
                        <CommonPopOver hover text="lower-case" childrenClass="typography">
                            Lower-case letters: Also known as little letters, e.g. b q or m.
                        </CommonPopOver>
                    </div>
                    ).
                </li>
                <li>
                    Player 2 writes the other kind of letter next to it (upper-case if Player 1 did lower-case or lower-case if Player 1 did
                    upper-case). Player 2 should make sure to do it the correct comparative size (and checking formation and orientation).
                </li>
                <li>Smooth out the flour ready for the next letter.</li>
                <li>Repeat with other letters, taking it in turns to be Player 1.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/letter_in_flour.png`}
                    alt="letter in flour"
                />
            </div>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Letter Formation">
                    <DownloadAlphabetsPDF
                        array={[...sharedJson.alphabets, { text: <br /> }].concat(
                            sharedJson?.alphabets.map((i) => ({ text: i.text.toUpperCase() }))
                        )}
                    />
                </DialogBox>
            )}
            <br />
            <br />
        </div>
    );
};

LettersInFlour.propTypes = { type: PropTypes.string };

export default LettersInFlour;
