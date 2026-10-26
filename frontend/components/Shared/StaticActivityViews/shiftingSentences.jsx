/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const ShiftingSentences = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday good_and_bad shifting_sentences">
            <Heading1 centerText text="Shifting Sentences" />

            <Divider customClass="mt7 mb5" />

            <Paragraph>
                For this activity, you will need a way of writing a sentence where you can rub out and change words. You could use:
            </Paragraph>
            <ul>
                <li>A whiteboard and pen</li>
                <li>Chalks</li>
                <li>A pencil and rubber (although there will be a lot of rubbing)</li>
                <li>A computer.</li>
            </ul>
            <Paragraph>
                If you don’t have a way of rubbing out, leave lots of space between the lines so you can cross words out and write the new
                ones above them.
            </Paragraph>

            <Divider customClass="mt7 mb5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />

            <ol>
                <li>
                    One player should write a long sentence with lots of interesting details. There should be lots of descriptive words
                    because these are fun to change. If you get stuck, there are some ideas here:
                </li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Starter sentences" color="inherit" />
            </div>

            <ol>
                <li className="hidden_item" />
                <li>Take it in turns to change one word. The sentence can get silly but it must still make sense.</li>
                <li>
                    You can’t change a word that was changed last time. You should challenge yourself by changing a word that’s been sitting
                    there exactly the same for ages!
                </li>
                <li>
                    Think about where the sentence is going – one person might change a word and you can change something else to move the
                    sentence in the same direction.
                </li>
                <li>Keep going until there’s nothing left to change and the sentence feels finished!</li>
            </ol>

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/rubber.png`} alt="rubber" />
            </div>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Extra challenges" />

            <br />

            <ol>
                <li>Think about your original sentence and your end sentence. Which do you prefer and why?</li>
                <li>
                    Try with a shorter sentence and not writing anything down. You’ll need a good memory but it can be fun to play by saying
                    the sentence aloud instead of writing it down!
                </li>
                <li>Use your end sentence as a story starter. What kind of incredible story will it lead you to write?</li>
            </ol>

            <br />

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    className="activity_modal"
                    heading="Sentences to get you started">
                    <Paragraph>When I was three, I laughed as an enormous cow started dancing in its field.</Paragraph>
                    <br />
                    <Paragraph>
                        The driver looked surprised when the tracks turned into rainbows and the train began to soar into the sky.
                    </Paragraph>
                    <br />
                    <Paragraph>Grandma’s cat rushed through the door and began to miaow as though it had never eaten before.</Paragraph>
                    <br />
                    <Paragraph>
                        After a heavy shower of rain, Dilly suddenly realised that she should have brought her new wellies to the park.
                    </Paragraph>
                    <br />
                </DialogBox>
            )}
        </div>
    );
};

ShiftingSentences.propTypes = { type: PropTypes.string };

export default ShiftingSentences;
