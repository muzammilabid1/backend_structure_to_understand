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

const ImproveIt = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday improveIt">
            <Heading1 centerText text="Improve it!" />
            <Divider customClass="mt5 mb10" />

            <Paragraph>
                In this game, players add words to a{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="statement" childrenClass="typography">
                        Statement: A statement sentence is the most common type of sentence. These tell the person reading a fact or idea
                        about a single topic. They usually end in a full stop (though sometimes they have exclamation marks).
                    </CommonPopOver>
                </div>{' '}
                to make it more interesting. You can choose whether to play collaboratively (where you work together) or competitively
                (where you try to win).
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="How to play the collaborative version" />

            <br />

            <ol>
                <li>
                    Choose (or invent your own) short statement sentence, e.g. “Dogs are hairy.” View more statements you could use by
                    clicking the button below.
                </li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Statement Sentence Bank" />
            </div>

            <ol>
                <li className="hidden_item" />
                <li>Player 1 adds a word to the statement to make it more interesting, e.g. “Dogs are very hairy.”</li>
                <li>
                    Player 2 thinks if they could add another word to the statement, e.g. “<span className="_span_red">Some</span> dogs are{' '}
                    <span className="_span_red">very</span> hairy.”
                </li>
                <li>Take it in turns to add another word until you can’t think of anything more to add.</li>
                <li>Repeat with a different statement.</li>
            </ol>

            <br />

            <Paragraph>
                If you wanted to have an extra discussion, you could talk about whether the final, longest sentence was actually the best.
                Sometimes it’s possible to go too far!
            </Paragraph>

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group1.png`} alt="cat" />
            </div>

            <br />

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="How to play the competitive version" />

            <br />

            <ol>
                <li>
                    Choose (or invent your own) short statement sentence, e.g. “Dogs are hairy.” View more statements you could use by
                    clicking the button below.
                </li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Statement Sentence Bank" />
            </div>

            <ol>
                <li className="hidden_item" />

                <li>Both players think of ways to add to the sentence. You could add one word or lots of words!</li>
                <li>Both players write down their sentence.</li>
                <li>Read your sentences aloud.</li>
                <li>Decide which sentence was better and why!</li>
                <li>The winner gets a point.</li>
                <li>Repeat with other statements.</li>
                <li>After five sentences, see who has the most points!</li>
            </ol>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Short Statement Sentence Bank">
                    <Paragraph>
                        Cats like mice.
                        <br />
                        Dolphins can swim.
                        <br />
                        Nobody likes peas.
                        <br />
                        Dinosaurs could fly.
                        <br />
                        The king was excited.
                        <br />
                        The lion opened its eyes.
                        <br />
                        The mermaid flicked her tail.
                        <br />
                        The train stopped.
                        <br />
                        Grandma got off the bus.
                    </Paragraph>
                </DialogBox>
            )}
            <br />
            <br />
        </div>
    );
};

ImproveIt.propTypes = { type: PropTypes.string };

export default ImproveIt;
