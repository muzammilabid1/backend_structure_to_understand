/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const GuessMyWord = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday improveIt guess_My_Word">
            <Heading1 centerText text="Guess My Word" />
            <br />

            <Divider customClass=" mb5" />

            <Paragraph>You will need:</Paragraph>
            <ul>
                <li>A piece of Paper</li>
                <li>Something to write with</li>
            </ul>
            <Divider customClass=" mb5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />
            <br />
            <ol>
                <li>Player 1 thinks of a word and writes a dashed line at the top of the page (one dash for each letter in the word).</li>
                <li>
                    Player 2 guesses a word which will fit. The first guess is easy – it just has to have the right number of letters! If
                    the word fits, Player 2 gets one point. It can be useful to keep a tally of the points in each round to help you keep
                    track!
                </li>
                <li>Player 1 writes one letter on the dashed line (make sure it’s in the right place).</li>
                <li>
                    Player 2 guesses a word which will fit. This is a bit harder as it has to include the letter Player 1 added in the same
                    place in the word. If the word fits, Player 2 gets one point. If Player 2 can’t think of a word, they are allowed to
                    pass (not make a guess). They won’t get any points for passing!
                </li>
                <li>Player 1 writes another letter on the dashed line.</li>
                <li>Player 2 makes another guess.</li>
                <li>
                    Carry on like this until Player 2 correctly guesses the word. At this point, Player 2 gets two points for every empty
                    letter space.
                </li>
                <li>Add up Player 2’s points.</li>
                <li>Swap over so the other player has a chance to guess a word. Make the word the same length to make the game fair!</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group9.png`}
                    alt="this place"
                />
            </div>
            <br />

            <Paragraph>Find an example game by clicking the button below.</Paragraph>

            <div className="btn_container">
                <LWPButton customClass="diamondBtn" onClick={() => setOpen(true)} btnText="Example game" color="inherit" />
            </div>

            {open && (
                <DialogBox className="find_a_word_dialog" open={open} setOpen={() => setOpen(!open)} type={type} heading="Example Game">
                    <div className="exampleGame">
                        <li>
                            Player 1: Chooses the word “square” and writes <span className="_span"> _ _ _ _ _ _ </span>at the top of the
                            page.
                        </li>
                        <li>Player 2: Guesses “tropic”. It’s wrong but it fits so they get one point.</li>
                        <li>
                            Player 1: Writes one letter in so it says <span className="_span">_ _ _ a _ _ </span>at the top of the page.
                        </li>
                        <li>Player 2: Guesses the word “triage”. It’s wrong but it fits so they get one point.</li>
                        <li>
                            Player 1: Writes one letter in so it says <span className="_span">_ _ _ a _ e </span>at the top of the page.
                        </li>
                        <li>
                            Player 2: Guesses “primate” but it’s too long. So they choose “lipase” which is wrong but does fit so they get
                            one point.
                        </li>
                        <li>
                            Player 1: Writes one letter in so it says <span className="_span">s _ _ a _ e</span> at the top of the page.
                        </li>
                        <li>
                            Player 2: Guesses the word “strate”. But that’s not a real word. They can’t think of a real word that fits, so
                            they pass and get zero points.
                        </li>
                        <li>
                            Player 1: Writes one letter in so it says<span className="_span"> s _ u a _ e </span>at the top of the page.
                        </li>
                        <li>
                            Player 2: Guesses the word “square”. They are right! That means they get four points (two for each of the
                            letters which are still not filled in).
                        </li>
                        <br />
                        <li>Player 2 gets six points this round!</li>
                    </div>
                </DialogBox>
            )}
            <Paragraph>
                <b>Top tip:</b>
                <br />
                Think about the spelling patterns you know to help you guess. Groups of letters that often go together will help you think
                of words. Thinking about{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="prefixes" childrenClass="typography">
                        Prefix: A prefix is a group of letters added at the beginning of a word in order to turn it into another word. They
                        cannot stand on their own as a complete word.
                    </CommonPopOver>
                </div>{' '}
                and{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="suffixes" childrenClass="typography">
                        Suffix: A suffix is an ‘ending’, used at the end of one word to turn it into another word. They cannot stand on
                        their own as a complete word.
                    </CommonPopOver>
                </div>{' '}
                will be especially helpful, e.g. if a word ends with “g” you might expect it to end “ing” because that is a common suffix.
                <br />
                <br />
                <b>Word list:</b>
                <br />
                Click the button below to download a list of words in case you want suggestions of words to use (you don’t need to print
                it).
            </Paragraph>

            <div className="btn_container">
                <DownloadPDFBtn btnText="Download Word list" url="/assets/pdf-files/GuessMyWord.pdf" />
            </div>
        </div>
    );
};

GuessMyWord.propTypes = { type: PropTypes.string };

export default GuessMyWord;
