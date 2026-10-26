/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const Ghost = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <Heading1 centerText text="Ghost" />
            <br />

            <Divider customClass=" mb5" />

            <Paragraph>
                Take it in turns to add letters which form the beginning of a real word but do not be the person who completes the word!
            </Paragraph>

            <Divider customClass=" my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <ul>
                <li>One player starts by saying a letter.</li>
                <li>Players take it in turns to add a letter.</li>
                <li>Each letter that is added must build towards a real word.</li>
                <li>
                    If you think the other player has added a letter that can’t make a real word, you can challenge them. If they can think
                    of a real word that begins with the letters, they win, but if they can’t, you win.
                </li>
                <li>
                    Up to (and including) when you have three letters, they can make a complete word. But if there are four or more letters
                    and the letter you added makes a complete word, you lose the game.{' '}
                </li>
            </ul>

            <div className="img_container ">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group10.png`}
                    alt="this place"
                />
            </div>
            <br />
            <Divider customClass=" mb5" />

            <Heading1 customClass="sub_heading" centerText text="Example game" />
            <br />
            <div className="">
                <Paragraph>
                    Player 1: t <br />
                    Player 2: te (teddy)
                    <br />
                    Player 1: tea (team) “tea” is a real word, but it’s ok because it only has three letters
                    <br />
                    Player 2: teac (teach)
                    <br />
                    Player 1: teaci (bluffing, there aren’t any words that start like this)
                    <br />
                    Player 2: Challenge!
                    <br />
                    Player 1 loses because they don’t have a word that starts “teaci”.
                    <br />
                    <br />
                    Once you have played a few times, you might enjoy a more challenging version of the game called “Superghost”. You can
                    see an example by clicking the button below.
                </Paragraph>
            </div>

            <div className="btn_container">
                <LWPButton customClass="diamondBtn" onClick={() => setOpen(true)} btnText="Superghost" color="inherit" />
            </div>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Superghost">
                    <Paragraph>
                        This version is played just like Ghost but you can add letters at the beginning or the end of the string.
                        <br />
                        <br />
                        <b>Example game:</b>
                        <br />
                        <br />
                        Player 1: t <br />
                        Player 2: ta (taps) <br />
                        Player 1: pta (captain) <br />
                        Player 2: ptag (???) <br />
                        Player 1: Challenge! <br />
                        Player 2: It does make a real word! Heptagon! <br />
                        <br />
                        Player 2 wins! <br />
                        <br /> <br />
                        You can make the game even more challenging by allowing players also to add letters in the middle of the word
                        string!
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

Ghost.propTypes = { type: PropTypes.string };

export default Ghost;
