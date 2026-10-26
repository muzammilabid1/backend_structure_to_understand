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

const TopFiveAnimals = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday top_five_animals">
            <Heading1 centerText text="Top Five Animals" />

            <Divider customClass="mt5 mb10" />

            <Paragraph>In this activity, you will be think about your favourite animals and writing a list</Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Talk" />
            <br />
            <br />

            <ol>
                <li>What is your favourite animal?</li>
                <li>Do you have the same favourite animal as each other?</li>
                <li>Why is it your favourite?</li>
                <li>Can you think of a top five animals?</li>
                <li>Why did you pick those?</li>
                <li>Can you put them in order with your most favourite first?</li>
            </ol>

            <br />
            <Divider customClass="my5" />
            <br />

            <Heading1 customClass="sub_heading" centerText text="Write" />
            <br />
            <br />

            <ol>
                <li>Write the numbers 1-5 down the side of a piece of paper.</li>
                <li>Write your favourite animal next to number 1.</li>
                <li>Write the other animals in your list too.</li>
                <li>Both people should write their own list!</li>
                <li>Click the button below to look at some top tips for spelling</li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Top tips for spelling" />
            </div>

            <Divider customClass="mt5 mb10" />

            <Heading1 customClass="sub_heading" centerText text="Draw" />
            <br />
            <br />

            <Paragraph>Why not draw a picture of your favourite animal to go with your list?</Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/top_five_animals.png`}
                    alt="top five animals"
                />
            </div>

            <br />
            <br />
            {open && (
                <DialogBox
                    className="activity_modal"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading="Top tips for spelling">
                    <ol>
                        <li>Ask your child to say the animal name.</li>
                        <li>Can they say what phoneme (sound) it begins with?</li>
                        <li>Do they know how to write that sound?</li>
                        <li>
                            Ask your child to say what{' '}
                            <div className="pop_over">
                                <CommonPopOver childrenClass="typography" hover text="phoneme">
                                    Phoneme: a sound in a word
                                </CommonPopOver>
                            </div>{' '}
                            (sound) comes next.
                        </li>
                        <li>Keep going back to the whole word to check you are not missing any phonemes.</li>
                    </ol>

                    <br />

                    <Paragraph>
                        <b>
                            What if they don’t know that{' '}
                            <div className="pop_over">
                                <CommonPopOver childrenClass="typography" bold hover text="grapheme">
                                    Grapheme: the way you write a sound in a word
                                </CommonPopOver>
                            </div>{' '}
                            yet?
                        </b>
                        <br />
                        If there are any graphemes (ways of writing the sounds) your child does not know how to write, you could put the
                        spelling of that sound at the top of the paper for them to copy. E.g. in the word ‘goat’, they should know it starts
                        with ‘g’ and ends with ‘t’ but you might need to tell them how to write the ‘oa’.
                    </Paragraph>

                    <br />

                    <Paragraph>
                        <b>Do they need to spell the words correctly?</b> <br />
                        No! For children starting out with writing, it doesn’t matter. The first thing to work on is making sure there is a
                        letter (or letters) for every phoneme (sound) in the word.
                    </Paragraph>

                    <br />

                    <Paragraph>
                        <b>But can I tell them the correct spelling?</b> <br />
                        Of course!
                        <ul>
                            <li>
                                It is most important that children want to have a go at writing words, so make sure they don’t worry too
                                much about all the spelling being perfect.
                            </li>
                            <li>Sometimes they are interested to know the correct spelling so you can write it down to show them.</li>
                            <li>
                                If you are writing a card or letter to someone, it is important that you spell their name correctly (it’s
                                more polite to get that right). This is a good way to introduce the idea that words do have correct
                                spellings.
                            </li>
                        </ul>
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

TopFiveAnimals.propTypes = { type: PropTypes.string };

export default TopFiveAnimals;
