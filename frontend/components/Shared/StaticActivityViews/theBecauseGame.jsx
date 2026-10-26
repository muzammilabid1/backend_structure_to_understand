/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const TheBecauseGame = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday">
            <Heading1 centerText text="The Because Game" />
            <Divider customClass="my5" />

            <Paragraph>
                You can use the word ‘because’ to join two parts of a sentence. Usually, you use ‘because’ in the middle, e.g. &quot;I am
                wearing my hat because it is a really sunny day.&quot;
                <br />
                <br />
                In this game, the players use ‘because’ to keep adding their own ideas. You will find that you start telling a story
                together!
            </Paragraph>

            <Divider customClass="mt5 mb10" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />
            <br />
            <br />

            <ul>
                <li>Player 1 says a short sentence.</li>
                <li>Player 1 then adds the word ‘because’ and a reason.</li>
                <li>
                    Player 2 uses this second{' '}
                    <u style={{ cursor: 'pointer' }} onClick={() => setOpen(true)}>
                        clause
                    </u>{' '}
                    (the part of the sentence after because) to start their own sentence.
                </li>
                <li>Player 2 then adds the word ‘because’ and a reason.</li>
                <li>Player 1 takes this second clause to make their own sentence. Keep going until your story comes to an end!</li>
            </ul>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Example game" />
            <br />
            <br />

            <Paragraph>
                Player 1: <span className="_span_red">The dragon was very unhappy</span> because{' '}
                <span className="_span">he had lost his fiery breath.</span>
                <br />
                Player 2: <span className="_span">He had lost his fiery breath</span> because{' '}
                <span className="_span_green">he drank a river full of water.</span>
                <br />
                Player 1: <span className="_span_green">He drank a river full of water</span> because{' '}
                <span className="_span_blue">he wanted to rescue the princess.</span>
                <br />
                Player 2: <span className="_span_blue">He wanted to rescue the princess</span> because{' '}
                <span className="_span_purple">her boat was sinking.</span>
                <br />
                Player 1: <span className="_span_purple">Her boat was sinking because…</span>
            </Paragraph>

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Dragon.png`} alt="Dragon" />
            </div>
            <br />

            {open && (
                <DialogBox className="activity_modal" open={open} setOpen={() => setOpen(!open)} type={type} heading={'Clause'}>
                    <Paragraph>
                        Clauses are groups of words that contain a subject and a verb. It can be easiest to think of them as simple
                        sentences, e.g:
                    </Paragraph>
                    <ul>
                        <li>I ran to school. “I” is the subject of this clause and “ran” is the verb.</li>
                        <li>
                            The fat, red hen hopped up into the safety of her tree house. “hen” is the subject of this clause and “hopped”
                            is the verb.
                        </li>
                    </ul>

                    <br />

                    <Paragraph>
                        Clauses don’t have to be the whole sentence – you can put more than one clause together to make a longer sentence.
                        In these examples, one clause is coloured red and the other blue, e.g.
                        <ul>
                            <li>
                                <span className="_span_red">The duck swam across the pond</span> and{' '}
                                <span className="_span_blue">she climbed out the other side.</span>
                            </li>
                            <li>
                                While <span className="_span_red">mum was talking</span>,{' '}
                                <span className="_span_blue">the children helped themselves to cake</span>.
                            </li>
                        </ul>
                        <br />
                        In these sentences, one word is left black. This is a conjunction which is joining the two clauses together.
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

TheBecauseGame.propTypes = { type: PropTypes.string };

export default TheBecauseGame;
