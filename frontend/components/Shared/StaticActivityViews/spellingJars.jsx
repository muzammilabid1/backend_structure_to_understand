/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const SpellingJars = ({ type }) => {
    const [open, setOpen] = useState(false);
    const [word, setWord] = useState('a');

    return (
        <div className="happy_birthday improveIt chair_in_the_world">
            <Heading1 centerText text="Spelling Jars" />

            <Divider customClass="my5" />

            <Paragraph>For this activity, you will need:</Paragraph>
            <ul>
                <li>A pencil</li>
                <li>Paper</li>
                <li>Two jars or tubs. Label one “Practise jar” and the other “Words I know”.</li>
                <li>Word cards (Use your cards from activity 1 or click the button below to see them).</li>
            </ul>

            <DownloadPDFBtn url="/assets/pdf-files/SpellingJars.pdf" btnText="Word cards" />

            <Paragraph>
                This is a game to carry on playing over time – you can’t be sure you have a correct spelling fixed in your head after only
                practising once.
            </Paragraph>

            <br />

            <ol>
                <li>Put all your words into one jar. This is your practice jar.</li>
                <li>Label the empty jar so you remember it is for the words you know.</li>
            </ol>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="The aim of the game" />

            <br />

            <Paragraph>Take a word from the practise jar.</Paragraph>

            <br />

            <Paragraph>If it has zero or one ticks:</Paragraph>
            <ol>
                <li>Read the word aloud.</li>
                <li>Turn the card over so you can&apos;t see the word.</li>
                <li>Write the word on the paper.</li>

                <li>Flip the card back over and check your spelling.</li>
                <li>If you made a mistake, copy the correct spelling of the word next to your mistake.</li>
                <li>
                    If you got it right, put a tick on the card next to the word (this is so you can keep track of how many times you’ve got
                    it right).
                </li>
                <li>Put the word to one side and put it back in the practise jar at the end of the game.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/spelling_jars.png`}
                    alt="spelling jars"
                />
            </div>

            <Paragraph>If it has two ticks:</Paragraph>
            <ol>
                <li>Give it to your grownup.</li>
                <li>
                    They will then give you a sentence containing the word. Click the button below to view a list of sentences that you
                    could use.
                </li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Example sentences" color="inherit" />
            </div>

            <ol>
                <li className="hidden_item" />
                <li className="hidden_item" />
                <li>You need to write the whole sentence.</li>
                <li>
                    If you spell the word correctly in the sentence, you can add your third tick and put it in the other jar for “Words I
                    know”.
                </li>
            </ol>

            <br />

            <Paragraph>
                Repeat with some more words from the practise jar. It would be too tiring to do them all, so maybe just do ten or so each
                time you do this activity.
            </Paragraph>

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    className="spelling_jars_dialog "
                    heading="Sentences to get you started">
                    <Paragraph>Click any of the letters below to see some words with sentences for context.</Paragraph>

                    <Paragraph customClass="bold_fonts">
                        {sharedJson?.alphabets.map((alphabet) => {
                            if (!sharedJson?.words_and_sentences[alphabet.text].length) return;

                            return (
                                <span className={word === alphabet.text ? '_span' : ''} onClick={() => setWord(alphabet.text)}>
                                    {alphabet.text}
                                </span>
                            );
                        })}
                    </Paragraph>

                    <Paragraph customClass="spacing_text" centerText>
                        {sharedJson?.words_and_sentences[word].map((sentences) => (
                            <>
                                {sentences}
                                <br />
                                <br />
                            </>
                        ))}
                    </Paragraph>
                </DialogBox>
            )}
            <br />
        </div>
    );
};

SpellingJars.propTypes = { type: PropTypes.string };

export default SpellingJars;
