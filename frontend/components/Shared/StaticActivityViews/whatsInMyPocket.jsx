/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const WhatsInMyPocket = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday good_and_bad">
            <Heading1 centerText text="What's in my pocket?" />

            <Divider customClass="my5" />

            <Paragraph>
                When you are walking around your house (or somewhere outside), pick up a small object and put it in your pocket. It can be
                anything at all! You might already have something in there. Both players can do this at the same time or one person can
                start and the other can find something before it is their turn.
            </Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Player 1 says, “What’s in my pocket?”</li>
                <li>Player 2 has twenty questions to find out what it could be.</li>
                <li>Questions must be answered with “yes” or “no”.</li>
                <li>
                    Your last question should be, “Is it___?” If you asked this on or before question number twenty, and you get it right,
                    you win.
                </li>
                <li>When Player 2 has guessed correctly (or run out of questions), Player 1 can reveal what was in their pocket!</li>
                <li>Player 1 wins if Player 2 can’t guess the object in twenty questions.</li>
            </ol>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Tips for good questions" />

            <br />
            <br />

            <ul>
                <li>
                    Don’t be too specific to start with – if your first question is, “Is it a rock?” you might be very lucky and get it
                    right first try, but more likely Player 1 will say, “no” and you still won’t have a clue what it is.
                </li>
                <li>
                    Think about what the object could be like (what it might feel like, what it is made of, what it is for etc) and use that
                    to help ask your questions.
                </li>
            </ul>

            <Paragraph>Click the button below to view an example game.</Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/what_in_my_pocket.png`}
                    alt="what in my pocket"
                />
            </div>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Example game" />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Level-up" />

            <br />
            <br />

            <ul>
                <li>
                    Make the object more specific. Instead of “a hair clip” it could be “the hair clip Jenny gave me for my birthday” or
                    instead of “a pebble” it could be “a pebble from the gravel around the washing line”.
                </li>
                <li>
                    Once you’ve mastered making it more specific, you could start imagining an object in your pocket rather than actually
                    having it. Then you could have things like “Uncle Bill’s goldfish” or “A hair from the mane of a unicorn”. It can be
                    anything at all, but it should still fit in your pocket!
                </li>
            </ul>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} className="activity_modal" heading="Example game">
                    <Paragraph customClass="italic">Player 1 has a snail shell in their pocket.</Paragraph>

                    <br />

                    <ul>
                        <li>Player 1: What’s in my pocket?</li>
                        <li>Player 2: Is it soft? (1)</li>
                        <li>Player 1: No </li>
                        <li>Player 2: Was it alive? (2)</li>
                        <li>Player 1: Yes</li>
                        <li>Player 2: Is it flat? (3)</li>
                        <li>Player 1: No</li>
                        <li>Player 2: Is it smaller than my thumb nail? (4)</li>
                        <li>Player 1: No</li>
                        <li>Player 2: Could it move by itself? (5)</li>
                        <li>Player 1: Yes</li>
                        <li>Player 2: Is it part of an animal? (6)</li>
                        <li>Player 1: Yes</li>
                        <li>Player 2: Is it some kind of shell? (7)</li>
                        <li>Player 1: Yes</li>
                        <li>Player 2: Is it a snail shell? (8)</li>
                        <li>Player 1: Yes, you’ve got it!</li>
                    </ul>

                    <br />

                    <Paragraph customClass="italic">Player 2 wins because they guessed it correctly on their eighth question.</Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

WhatsInMyPocket.propTypes = { type: PropTypes.string };

export default WhatsInMyPocket;
