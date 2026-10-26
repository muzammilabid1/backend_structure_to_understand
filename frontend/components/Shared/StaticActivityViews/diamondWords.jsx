/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const DiamondWords = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday improveIt diamond_words">
            <Heading1 centerText text="Diamond Words" />
            <br />

            <Divider customClass=" mb5" />

            <Paragraph>
                For this game, you will need a piece of paper and something to write with. You can choose if you work together or both make
                your own diamond.
            </Paragraph>

            <Divider customClass=" my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />
            <br />

            <ul>
                <li>Start with a two-letter word and write it at the top of your page.</li>
                <li>Underneath, write a three-letter word that starts with the last letter of your two-letter word.</li>
                <li>Below that, write a four-letter word that starts with the last letter of the three-letter word.</li>
                <li>Keep going until you get up to ten letters. You have made a word triangle!</li>
            </ul>

            <Paragraph>If you get stuck, you have two options:</Paragraph>
            <ol>
                <li>Go back to a previous word and change it.</li>
                <li>Start again from the beginning and see if you can reach a longer word next time.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group8.png`}
                    alt="this place"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />
            <br />

            <ul>
                <li>After the ten-letter word, write a nine-letter word.</li>
                <li>Keep going until you get back to two letters.</li>
                <li>When you have finished, you will see that you have made a diamond shape with your words!</li>
            </ul>

            <Paragraph>Click the button below for an example of a completed diamond.</Paragraph>

            <div className="btn_container">
                <LWPButton customClass="diamondBtn" onClick={() => setOpen(true)} btnText="Example diamond" color="inherit" />
            </div>

            {open && (
                <DialogBox className="find_a_word_dialog" open={open} setOpen={() => setOpen(!open)} type={type} heading="Example diamond">
                    <Paragraph centerText customClass="diamond">
                        at
                        <br />
                        tan
                        <br />
                        nave
                        <br />
                        evens
                        <br />
                        scream
                        <br />
                        meatily
                        <br />
                        yourself
                        <br />
                        fabricate
                        <br />
                        earthquake
                        <br />
                        equipment
                        <br />
                        tracings
                        <br />
                        species
                        <br />
                        spaced
                        <br />
                        diced
                        <br />
                        date
                        <br />
                        eat
                    </Paragraph>
                </DialogBox>
            )}

            <Divider customClass="mb5" />

            <Heading1 customClass="sub_heading" centerText text="Be competitive" />

            <br />

            <Paragraph>
                <Paragraph>If you want to be competitive, you could see who is first to make their own diamond.</Paragraph>
            </Paragraph>
            <br />
        </div>
    );
};

DiamondWords.propTypes = { type: PropTypes.string };

export default DiamondWords;
