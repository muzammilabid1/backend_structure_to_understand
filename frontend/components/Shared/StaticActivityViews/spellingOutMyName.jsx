/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SpellingOutMyName = () => {
    return (
        <div className="happy_birthday spelling_out_my_name">
            <Heading1 centerText text="Spelling Out My Name" />

            <Divider customClass="my5" />

            <Paragraph>
                Although we use phonics when sounding out words, letter names are important for when we talk about how words are spelled.
                This gets even more important when there is more than one way that you can spell a phoneme (sound).
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />
            <br />

            <ol>
                <li>Write your name on a piece of paper, </li>
                <li>
                    Tell the other person how to spell it using the letter names. Make sure you remind them to use a capital letter at the
                    start!
                </li>
                <li>They should write down what you say.</li>
                <li>When they have finished, compare your writing and their writing to check if they were right.</li>
            </ol>
            <br />

            <Paragraph>Here are some examples:</Paragraph>
            <ul className="unorder_list">
                <li>If your name is Ben, you would say ‘Capital bee, ee, en.’</li>
                <li>If your name is Mia, you would say ‘Capital em, igh, ay.’</li>
            </ul>
            <br />

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/ABC.png`} alt="ABC" />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />

            <br />

            <Paragraph>
                Without writing it down, can you spell out some other names or other words for the other person to guess what they are?
            </Paragraph>

            <br />

            <Paragraph>Here are some examples:</Paragraph>
            <ul className="unorder_list">
                <li>‘Capital ell, igh, ay, em’ – that spells Liam.</li>
                <li>‘Cee, ay, tee’ – that spells cat.</li>
            </ul>

            <br />
        </div>
    );
};

export default SpellingOutMyName;
