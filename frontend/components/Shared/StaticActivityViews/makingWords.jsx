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

const MakingWords = ({ type }) => {
    const [open, setOpen] = useState(false);
    const [dialogType, setDialogType] = useState('');

    const toggle = (type) => {
        setOpen(!open);
        setDialogType(type);
    };

    return (
        <div className="happy_birthday making_words">
            <Heading1 centerText text="Making words" />

            <Divider customClass="my5" />

            <Paragraph>
                For this activity, you will need some{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="lower-case">
                        Lower case: another way of saying ‘little letters’ or the letters which are not capital letters.
                    </CommonPopOver>
                </div>{' '}
                letter shapes. You can use magnetic letters or other shop-bought letter shapes, or click the button below to see some ideas
                on how to make your own.
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('yourLetters')} btnText="How to make your own letters" color="inherit" />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="The activity" />
            <br />
            <br />

            <Paragraph>Take it in turns to use the letters to make a word for the other person to read. </Paragraph>
            <br />

            <Paragraph>Here are some ideas of words to write:</Paragraph>
            <ul>
                <li>Can you write your name? (What special letter should you have at the start?)</li>
                <li>Can you write a short word?</li>
                <li>Can you write a long word?</li>
                <li>Can you make the other person laugh?</li>
                <li>Can you write a word for something you can see?</li>
            </ul>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/making_words.png`}
                    alt="top five animals"
                />
            </div>
            <br />
            <br />

            <Paragraph>Click the button below for some tips for spelling when using moveable letters.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('moveableLetters')} btnText="Top tips for spelling" />
            </div>

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading={dialogType === 'yourLetters' ? 'How to make your letters' : 'Tips for spelling when using moveable letters'}>
                    {dialogType === 'yourLetters' ? (
                        <>
                            <Paragraph>
                                You will need at least 26 things to write your letters on. If you have more, that will be good because some
                                words have the same letter more than once, but don’t worry too much – 26 is a good number to start with!
                            </Paragraph>
                            <br />

                            <Paragraph>
                                <b>What could you write letters on?</b> <br />
                                Pieces of card cut from a cereal box <br /> Milk bottle lids <br /> Large, dried beans, e.g. butterbeans{' '}
                                <br /> Wooden pegs <br /> Small pebbles <br />
                                Anything you like, as long as you can write on it and your child can move it around to make words!
                            </Paragraph>

                            <br />
                            <Paragraph>
                                <b>What should I write with?</b> <br />A permanent marker like a sharpie would work well. On wooden pegs, an
                                ordinary pen or felt tip will also work fine.
                            </Paragraph>

                            <br />
                            <Paragraph>
                                <b>What letters should I write?</b> <br />
                                The full alphabet in lower case. <br />
                                If you have some spares, the{' '}
                                <div className="pop_over">
                                    <CommonPopOver hover childrenClass="typography" text="capital letter">
                                        Capital letters: upper-case letters, e.g. ‘E’ or ‘Q’ (not ‘e’ or ‘q’).
                                    </CommonPopOver>
                                </div>{' '}
                                that starts your child’s name. <br /> If you have more spares, extra letters for any that are in your
                                child’s name more than once. <br /> If you still have spares, keep some blank in case your child asks for
                                something in particular.
                            </Paragraph>
                        </>
                    ) : (
                        <ul>
                            <li>Don’t worry too much about the spelling – they just need to have a go!</li>
                            <li>
                                The most important thing to check is that there are letters for all the{' '}
                                <div className="pop_over">
                                    <CommonPopOver hover childrenClass="typography" text="phonemes">
                                        Phoneme: a sound in a word
                                    </CommonPopOver>
                                </div>{' '}
                                (sounds) in the word. If there is something missing, you could read the word aloud, leaving out the sound
                                that is missing, and ask your child if they can spot what is missing. It’s easy to add letters in once
                                you’ve worked out what was missed!
                            </li>
                            <li>
                                If they are interested, you could build the correct spelling and they could move their letters around and
                                make changes so theirs matches yours!
                            </li>
                        </ul>
                    )}
                </DialogBox>
            )}
        </div>
    );
};

MakingWords.propTypes = { type: PropTypes.string };

export default MakingWords;
