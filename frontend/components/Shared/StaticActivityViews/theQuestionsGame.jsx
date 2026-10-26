/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const TheQuestionsGame = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday the_questions_game">
            <Heading1 centerText text="The Questions Game" />

            <Divider customClass="my5" />

            <Paragraph>
                In this game, you can only ask{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="questions!">
                        Question: A question sentence is used to ask something, usually to find out information. It ends with a question
                        mark. Common words used to start questions include who, what, where, when, how and why.
                    </CommonPopOver>
                </div>{' '}
            </Paragraph>

            <Divider customClass="mt5 mb10" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Player 1 asks a question.</li>
                <li>Player 2 responds to the question with another question.</li>
                <li>Player 1 replies with another question.</li>
                <li>The first player to say something other than a question loses.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/the_questions_game.png`}
                    alt="the questions game"
                />
            </div>

            <br />

            <Paragraph>To see an example game, click the button below.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Example game" />
            </div>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Example Game">
                    <Paragraph>Player 1: When did you last brush your teeth?</Paragraph>

                    <Paragraph>Player 2: Why do you want to know when I brushed my teeth?</Paragraph>
                    <Paragraph>Player 1: Don’t you remember when it was?</Paragraph>
                    <Paragraph>Player 2: Shouldn’t you remember?</Paragraph>

                    <Paragraph>Player 1: Do you think I remember everything?</Paragraph>
                    <Paragraph>Player 2: Why would I not think that?</Paragraph>
                    <Paragraph>Player 1: I don’t know. Can you tell me?</Paragraph>

                    <br />

                    <Paragraph>Player 1 loses because they said, “I don’t know” which is a statement rather than a question.</Paragraph>

                    <br />

                    <Paragraph>
                        <b>Tip:</b>
                        <br />
                        Ask open questions, starting with who, what, when, where, why and how rather than ones which need a yes/no answer.
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

TheQuestionsGame.propTypes = { type: PropTypes.string };

export default TheQuestionsGame;
