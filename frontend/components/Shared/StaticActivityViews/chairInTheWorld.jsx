/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const ChairInTheWorld = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday chair_in_the_world">
            <Heading1 centerText text="Chair in the World" />

            <Divider customClass="my5" />

            <Paragraph>
                In this game, one player thinks of a chair they have both sat in and the other player asks questions to find out which chair
                they have chosen.
            </Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Player 1 thinks of a chair that both players have sat in.</li>
                <li>
                    Player 1 starts the game by saying, “Chair in the world, chair chair chair!” (This can be sung to the tune of the PC
                    World advertising jingle if you want to try).
                </li>
                <li>Player 2 then asks questions to try to guess which chair Player 1 was thinking of.</li>
                <li>Player 1 must answer questions with “yes” or “no”.</li>{' '}
                <li>Player 2 keeps asking questions until they can guess which chair it is.</li>
                <li>Play again, but swap over so the other person has a go at guessing.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/chair_in_the_world.png`}
                    alt="this place"
                />
            </div>

            <br />

            <Paragraph>Click the button below to see some ideas of question starters that will give yes/no answers.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Question starters" />
            </div>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Question Starters">
                    <ul>
                        <li>Can</li>
                        <li>Will</li>
                        <li>Would </li>
                        <li>May</li>
                        <li>Might</li>
                        <li>Could</li>
                        <li>Does</li>
                        <li>Did</li>
                    </ul>
                </DialogBox>
            )}
        </div>
    );
};

ChairInTheWorld.propTypes = { type: PropTypes.string };

export default ChairInTheWorld;
