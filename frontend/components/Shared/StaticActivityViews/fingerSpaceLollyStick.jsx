/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const FingerSpaceLollyStick = ({ type }) => {
    const [open, setOpen] = useState(false);
    const [rightOrLeftHanders, setRightOrLeftHanders] = useState('');

    const toggle = (rightOrLeft) => {
        setOpen(!open);
        setRightOrLeftHanders(rightOrLeft);
    };

    const isTrue = () => rightOrLeftHanders === 'right';

    return (
        <div className="finger_space_lolly_stick happy_birthday">
            <Heading1 customClass="mein_heading" centerText text="Finger Space Lolly Stick" />

            <Divider customClass="my5" />

            <Paragraph>
                <b>You will need:</b>
            </Paragraph>
            <ul>
                <li>Paper;</li>
                <li>A pencil to write with;</li>
                <li>A lolly stick (or a strip of card about 20cm long and 1cm wide – you could cut it from a cereal box).</li>
            </ul>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="The activity" />

            <Paragraph customClass="write_a_sentence">
                Write a sentence on a piece of paper, using your finger space lolly stick to remind you about spaces. You can choose what
                sentence you write, or you can use one of these:
            </Paragraph>

            <Paragraph customClass="big_title" centerText>
                It is hot. <br /> My Dad has a big bag. <br /> The cow went moo. <br /> My Mum is tall.
            </Paragraph>

            <Paragraph customClass="click_one_of_the_buttons">
                Click one of the buttons below to see how to use your Finger Space Lolly Stick:
            </Paragraph>

            <Grid container spacing={2} className="finger_space_lolly_stick_img_container">
                <Grid xs={12} sm={6} className="grid_item">
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lollyStickLeftHanders.png`}
                        alt="left handers"
                    />
                    <LWPButton btnText="Left-Handers" onClick={() => toggle('left')} />
                </Grid>
                <Grid xs={12} sm={6} className="grid_item">
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lollyStickRightHanders.png`}
                        alt="right handers"
                    />
                    <LWPButton btnText="Right-Handers" onClick={() => toggle('right')} />
                </Grid>
            </Grid>
            {open && (
                <DialogBox
                    className="finger_space_lolly_stick_dialog_box"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading={`How to use your Finger Space Lolly Stick: ${isTrue() ? 'Right' : 'Left'}-handers`}>
                    <div className="inner_dialog_container">
                        {isTrue() ? (
                            <ul>
                                <li>
                                    When you have written a word, hold the stick in your left hand and put it after the word you just wrote.
                                    Keep it there while you start writing the next word to make sure you leave a space.
                                </li>
                                <li>
                                    If you are feeling confident, you could imagine where the stick would be, write the next word, and then
                                    use your stick to check your space afterwards.
                                </li>
                            </ul>
                        ) : (
                            <>
                                <Paragraph customClass="click_one_of_the_buttons">
                                    Being a leftie is tricky, so here are some extra tips:
                                </Paragraph>
                                <ul>
                                    <li>Hold in your right hand so you can still hold your pencil in your left hand.</li>
                                    <li>Hold the stick in the space from above rather than below so your arm is not in the way.</li>
                                    <li>
                                        You might find it more comfortable to use the lolly stick to point at the space instead of cover it
                                        because otherwise your writing hand has to travel over the stick.
                                    </li>
                                    <li>
                                        If the stick is getting in your way, or if you’re feeling confident, you can imagine where it would
                                        be, write the next word, and then use the stick to check your space afterwards!
                                    </li>
                                </ul>
                            </>
                        )}
                        <div className="dialog_img">
                            <img
                                src={
                                    isTrue()
                                        ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lollyStickRightHanders.png`
                                        : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lollyStickLeftHanders.png`
                                }
                                alt="rightOrLeftHanders"
                            />
                        </div>
                    </div>
                </DialogBox>
            )}
        </div>
    );
};

FingerSpaceLollyStick.propTypes = { type: PropTypes.string };

export default FingerSpaceLollyStick;
