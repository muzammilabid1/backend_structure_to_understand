/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const HappyBirthday = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday">
            <Heading1 centerText text="Happy birthday!" />

            <Divider customClass="my5" />

            <Paragraph>
                In this activity, you will be writing a card to someone and making sure you leave space between the words to help them read
                it easily. You could write in a bought card or make and decorate your own.
            </Paragraph>
            <br />
            <Paragraph>You could use your lolly stick from Activity 1 to help with the spaces!</Paragraph>
            <br />
            <Paragraph>Reasons to send a card:</Paragraph>
            <ul>
                <li>It’s someone’s birthday;</li>
                <li>To say thank you to someone;</li>
                <li>To celebrate a special occasion;</li>
                <li>Just because it’s nice to receive a card in the post!</li>
            </ul>

            <div className="birthday_img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Inside_a_card.png`}
                    alt="happy birthday"
                />
            </div>

            <Paragraph customClass="para">Click the button below for some tips on writing your card</Paragraph>
            <div className="btn_container">
                <LWPButton btnText="Tips for writing your card" onClick={() => setOpen(true)} />
            </div>
            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />

            <Paragraph customClass="para">
                Why not write the address on the envelope too? You might want some more help with the spelling here so the post office don’t
                get confused!
            </Paragraph>

            {open && (
                <DialogBox
                    className="finger_space_lolly_stick_dialog_box"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading={'Tips for writing'}>
                    <Paragraph>
                        <b>Sitting</b>
                        <br />
                        Make sure your child has somewhere to sit for writing, ideally a chair at a table with their feet touching the
                        floor. If this isn’t possible any chair and table will be ok, or even just a solid surface to put the paper on.
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>Lines</b>
                        <br />
                        Draw lines for your child to write on using a pencil and ruler.
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>Spaces</b>
                        <br />
                        Talk about the spaces while they are writing to help them remember.
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>Spelling: have a go!</b>
                        <br />
                        Let your child have a go at simpler words, and with harder words if they want to – it is most important that
                        children want to have a go at writing words, so make sure they don’t worry too much about all the spelling being
                        perfect.
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>“Correct” spelling</b>
                        <br />
                        If you are writing a card or letter to someone, it is important that you spell their name correctly (it’s more
                        polite to get that right). This is a good way to introduce the idea that words do have correct spellings.
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>You can help with part of a word</b>
                        <br />
                        Help with the tricky part of a word, e.g. your child might work out that the two sounds in “boy” are “b” and “oi”.
                        It is ok if they just write “boi” but if they ask how the “oi” sound is spelled, you can write “oy” for them to
                        copy.
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>What if the writing is hard to read?</b>
                        <br />
                        If the words are not all spelled perfectly or written legibly, it doesn’t matter – you can always write the message
                        again in adult handwriting on the left-hand side of the card before you send it to help the person receiving it!
                    </Paragraph>
                    <br />

                    <Paragraph>
                        <b>What if my child is not a confident writer yet?</b>
                        <br />
                        Don’t worry! They don’t need to write all the words to enjoy this activity! They could just write two important
                        words, with the space between (e.g. Happy Birthday or Thank you) and you can write the rest. They will also enjoy
                        writing their own name at the end!
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

HappyBirthday.propTypes = { type: PropTypes.string };

export default HappyBirthday;
