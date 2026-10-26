/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SpeedReading = () => {
    return (
        <div className="happy_birthday speed_reading">
            <Heading1 centerText text="Speed Reading" />
            <Divider customClass="my5" />

            <Paragraph>
                You will need your{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="common exception word">
                        Common exception words: These are words which are hard to spell because they do not follow the phonics rules you
                        have learned so far. These words could be useful in your writing though, so it is good to learn them.{' '}
                    </CommonPopOver>
                </div>{' '}
                cards to play these games!
                <br />
                <br />
                Your teacher might have sent home some words. If not, click the button below to get some. If you are unable to print, you
                could make your own by writing the words in the PDF onto rectangles of card, maybe cut from a cereal box.
            </Paragraph>

            <div className="btn_container">
                <DownloadPDFBtn color="primary" btnText="Common exception word cards (PDF)" url="/assets/pdf-files/SpeedReading.pdf" />
            </div>

            <Paragraph>
                You will need to choose which set of words to print, depending on how confident your child is with their reading and
                spelling.
            </Paragraph>

            <Divider customClass="mt5 mb10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 1: Speed Reading" />

            <br />
            <br />

            <ol>
                <li>Put the exception word cards in a pile.</li>
                <li>Turn over the top card.</li>
                <li>Ask your child to read the word.</li>
                <li>If they can read it, they can keep it. If they need help, the adult keeps it.</li>
                <li>Go through all the words in the pile.</li>
                <li>Count how many word are in each pile. Who won?</li>
                <li>Go through any words they didn&apos;t get to practise them.</li>
                <li>Mix up the cards and have another go. Can you beat your score from last time?</li>
            </ol>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 2: Sentences" />

            <br />
            <br />

            <ol>
                <li>Put the exception word cards in a pile.</li>
                <li>Turn over the top card.</li>
                <li>Read the word.</li>
                <li>Say a sentence using the word.</li>
                <li>Repeat with the other word cards in the pile.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/speed_reading.png`}
                    alt="speed reading"
                />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 3: Make it competitive" />

            <br />
            <br />

            <ol>
                <li>Put the exception word cards in a pile.</li>
                <li>Set a timer for one minute.</li>
                <li>Start the timer and turn over the top card.</li>
                <li>Read the word.</li>
                <li>Say a sentence using the word.</li>
                <li>See how many words you can put into sentences in a minute.</li>
                <li>Can the other person do as many as you?</li>
            </ol>

            <br />
            <br />
        </div>
    );
};

export default SpeedReading;
