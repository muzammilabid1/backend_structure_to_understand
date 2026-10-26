/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const WordCards = () => {
    return (
        <div className="happy_birthday good_and_bad word_cards">
            <Heading1 centerText text="Word Cards" />

            <Divider customClass="my5" />

            <Paragraph>
                You will need your word cards to play these games. You might have brought some words home from school, but if not, you can
                click the button below to download a PDF with them on.
            </Paragraph>

            <div className="btn_container">
                <DownloadPDFBtn url="/assets/pdf-files/WordCards.pdf" btnText="Word cards (PDF)" />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Warmup: Speed Reading" />

            <br />
            <br />

            <ol>
                <li>Put the word cards in a pile.</li>
                <li>Turn over the top card.</li>
                <li>Read the word.</li>
                <li>If you can read it, you can keep it. If you need help, the adult keeps it.</li>
                <li>Go through all the words in the pile.</li>
                <li>Count how many word are in each pile. Who won?</li>

                <li>Go through any words you didn&apos;t get to practise them.</li>
                <li>Mix up the cards and have another go. Can you beat your score from last time?</li>
            </ol>

            <br />

            <Paragraph>
                If you can read all your words, you can try playing against the clock. How fast can you get through all your words? If you
                try again, can you beat your time?
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/sand_timer.png`}
                    alt="what in my pocket"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Game: Word Sort" />

            <br />
            <br />

            <Paragraph>
                These words are from a list of words that people (even grownups) often spell wrong. That means they can be quite tricky! But
                there are patterns and connections between the words that can help with their spelling.
            </Paragraph>

            <br />

            <Paragraph>
                Have a go at sorting the words into different groups by things they have in common that might help to remember their
                spelling. Look for:
            </Paragraph>

            <ul>
                <li>Double letters</li>
                <li>Words that look different from how you say them</li>

                <li>
                    Similar ways of spelling the same{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="phoneme">
                            Phoneme: The sounds in a word, e.g. “night” has three phonemes: “n”, “igh” and “t”.
                        </CommonPopOver>
                    </div>{' '}
                </li>
                <li>Silent letters</li>
                <li>
                    {' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="Prefixes">
                            Prefix: A prefix is a group of letters added at the beginning of a word in order to turn it into another word.
                            They cannot stand on their own as a complete word.
                        </CommonPopOver>
                    </div>{' '}
                </li>
            </ul>

            <Paragraph>
                It doesn’t matter how you sort the words – the aim is to think about their spelling and see if you can spot any patterns or
                connections!
            </Paragraph>

            <br />
            <br />
        </div>
    );
};

export default WordCards;
