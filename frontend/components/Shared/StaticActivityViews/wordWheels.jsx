import { range } from 'lodash';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import DiceComponent from '../Dice';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const WordWheels = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday improveIt  Word_Wheels">
            <Heading1 centerText text="Word Wheels" />
            <br />
            <Divider customClass=" mb5" />

            <Paragraph>
                <b>The Aim of the Game:</b>
                <br />
                Make as many words as you can using the letters in the word wheel.
                <br />
                <br />
                <b>Rules:</b>
                <br />
            </Paragraph>
            <ul>
                <li>Each word must contain the central letter.</li>
                <li>Words must be at least three letters long.</li>
                <li>You can only use each letter once in each word.</li>
            </ul>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Word Wheels" />

            <br />

            <DiceComponent
                imgHeightProps="272px"
                imgWidthProps="272px"
                btnText="Pick a new wheel"
                inputArray={[
                    range(1, 6).map(
                        (i) => `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/wheels${i}.png`
                    )
                ]}
                inputType="IMAGE"
            />
            <br />

            <Paragraph>
                <b>Make it competitive:</b>
            </Paragraph>
            <ul>
                <li>See who can find the most words in two minutes.</li>
                <li>See who can be the first to find the nine-letter word.</li>
            </ul>

            <br />

            <Paragraph>Click the button below if you wish to see some more challenging word wheels.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Challenge Word Wheels" color="inherit" />
            </div>

            {open && (
                <DialogBox
                    className="Word_Wheels_dialog"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading="Challenge word wheels
                    ">
                    <Paragraph>Can you find the longest words in these wheels?</Paragraph>
                    <DiceComponent
                        imgHeightProps="272px"
                        imgWidthProps="272px"
                        btnText="Pick a new wheel"
                        inputArray={[
                            range(1, 6).map(
                                (i) => `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/wheels_pop${i}.png`
                            )
                        ]}
                        inputType="IMAGE"
                    />
                </DialogBox>
            )}
        </div>
    );
};

WordWheels.propTypes = { type: PropTypes.string };

export default WordWheels;
