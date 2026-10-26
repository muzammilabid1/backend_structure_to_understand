/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const BodyWriting = () => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="Body Writing" />

            <Divider customClass="my5" />

            <Paragraph>
                For this activity you will need the{' '}
                <Link passHref href={'/assets/pdf-files/CommonExceptionWords.pdf'}>
                    <a href={'/assets/pdf-files/CommonExceptionWords.pdf'} target="_blank" className="link">
                        <u>word cards you used in Activity 1</u>
                    </a>
                </Link>
                .
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />

            <br />
            <br />

            <ol>
                <li>Choose a word card.</li>
                <li>Use your body to make the shape of the first letter.</li>
                <li>Keep going, making one letter after another to spell out the whole word.</li>
                <li>
                    Can the other person read the word you are spelling out? They could write down the letters they see you make so you can
                    check against your word card at the end!
                </li>
                <li>Take it in turns to use your bodies to spell out different words on the cards.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/body_writing.png`}
                    alt="rsilly answers"
                />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />

            <br />
            <br />

            <Paragraph>
                Do the same activity, but this time read the card and then turn it face down before you spell it out. Did you remember what
                letters you needed?
            </Paragraph>

            <br />
            <br />
        </div>
    );
};

export default BodyWriting;
