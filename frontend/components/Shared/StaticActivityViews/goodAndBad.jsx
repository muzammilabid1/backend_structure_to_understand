/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const GoodAndBad = ({ type }) => {
    const [open, setOpen] = useState(false);
    const [modalType, setModalType] = useState('');

    const toggle = (type) => {
        setOpen(!open);
        setModalType(type);
    };

    return (
        <div className="happy_birthday good_and_bad">
            <Heading1 centerText text="Good and Bad" />

            <Divider customClass="my5" />

            <Paragraph>
                <b>The aim of the game:</b>
                <br />
                Player 1 chooses a letter of the alphabet. Player 2 needs to work out which letter they have chosen.
                <br />
                <br />
                Here are some <u onClick={() => toggle('questions_starters')}>question starters</u> to help you ask interesting questions.
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Player 1 chooses a letter.</li>
                <li>Player 1 asks a question which would have a one-word answer.</li>
                <li>Player 2 answers the question with one word (it needs to be a sensible answer).</li>
                <li>
                    Player 1 says “good” if the answer contains the letter they are thinking of or “bad” if it does not contain the letter.
                </li>
                <li>Player 2 thinks about the letters in their word and uses that to help them narrow down what letter it could be.</li>
                <li>Player 1 asks another question.</li>

                <li>Player 2 answers with a word that will help them further narrow down what letter it is.</li>
                <li>
                    Player 1 replies with “good” if the answer contains the letter they are thinking of or “bad” if it does not contain the
                    letter.
                </li>
                <li>
                    Keep asking and answering questions until Player 2 is ready to guess the letter. If they guess correctly, they win. If
                    they don’t, Player 1 wins.
                </li>
            </ol>

            <br />

            <Paragraph customClass="italic">
                If you have more than two players, Players 2 and 3 can compete against each other to be the first to guess the letter.
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/good_and_bad.png`}
                    alt="this place"
                />
            </div>

            <br />

            <Paragraph>Click the button below to view an example game.</Paragraph>

            <br />

            <div className="btn_container">
                <LWPButton onClick={() => toggle('example_game')} btnText="Example game" />
            </div>

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    className="activity_modal"
                    heading={modalType === 'questions_starters' ? 'Question starters' : 'Example game'}>
                    {modalType === 'questions_starters' ? (
                        <>
                            <ul>
                                <li>Who</li>
                                <li>What</li>
                                <li>Where </li>
                                <li>When</li>
                                <li>Why</li>
                                <li>How</li>
                                <li>Whose</li>
                                <li>Whither (this means “to where”)</li>
                                <li>Whence (this means “from where”)</li>
                                <li>Which</li>
                            </ul>

                            <br />

                            <Paragraph>You might know some other ways of starting questions too!</Paragraph>
                        </>
                    ) : (
                        <>
                            <Paragraph>
                                <em>Player 1 is thinking of the letter E</em>
                            </Paragraph>

                            <br />

                            <ul>
                                <li>Player 1: What did Grandma give you for your birthday?</li>
                                <li>Player 2: Socks</li>
                                <li>Player 1: Bad (there was no E in the answer)</li>
                                <li>
                                    Player 2:{' '}
                                    <em>
                                        (In their head) ab<span className="_span">c</span>defghij<span className="_span">k</span>lmn
                                        <span className="_span">o</span>pqr<span className="_span">s</span>tuvwxyz – rules out the letters
                                        in “socks”.
                                    </em>
                                </li>
                            </ul>

                            <br />

                            <ul>
                                <li>Player 1: Where did you go on holiday?</li>
                                <li>Player 2: Wales</li>
                                <li>Player 1: Good (there was an E)</li>
                                <li>
                                    Player 2:{' '}
                                    <em>
                                        (In their head) wale<span className="_span">s</span> – rules out all the letters apart from those in
                                        Wales, but also rules out S because that was in “socks”. Player 2 know knows it must be A, E, L or
                                        W.
                                    </em>
                                </li>
                            </ul>

                            <br />

                            <ul>
                                <li>Player 1: How many legs do you have?</li>
                                <li>Player 2: Two</li>
                                <li>Player 1: Bad (there was no E)</li>
                                <li>
                                    Player 2:{' '}
                                    <em>
                                        (In their head) <span className="_span">W</span>ale<span className="_span">s</span> – rules out W –
                                        the letter must be A, L or E
                                    </em>
                                </li>
                            </ul>

                            <br />

                            <ul>
                                <li>Player 1: What is your favourite food?</li>
                                <li>Player 2: Cheese</li>
                                <li>Player 1: Good</li>
                                <li>
                                    Player 2: <em>(In their head) There was no A or L in “cheese” so the letter must be E…</em>
                                </li>
                            </ul>

                            <br />

                            <ul>
                                <li>Player 1: Whose are those shoes?</li>
                                <li>Player 2: The letter E!</li>
                            </ul>
                        </>
                    )}
                </DialogBox>
            )}
        </div>
    );
};

GoodAndBad.propTypes = { type: PropTypes.string };

export default GoodAndBad;
