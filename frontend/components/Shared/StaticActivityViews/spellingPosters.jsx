/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SpellingPosters = () => {
    return (
        <div className="happy_birthday good_and_bad spelling_posters">
            <Heading1 centerText text="Spelling Posters" />
            <Divider customClass="mt7 mb5" />

            <Paragraph>Make three posters to help you remember the spelling of three tricky words.</Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/spelling_poster.png`}
                    alt="spelling posters"
                />
            </div>

            <br />

            <Paragraph>
                <b>Which words should I choose?</b>
                <ul>
                    <li>
                        Choose from the words you are practising. Click the button below to download a sheet with some good ones, (these are
                        the same words you used in Activity 1 and 2).
                    </li>
                </ul>
            </Paragraph>

            <div className="btn_container">
                <DownloadPDFBtn btnText="Word cards" url="/assets/pdf-files/SpellingPosters.pdf" />
            </div>

            <Paragraph>
                <ul>
                    <li>Choose three you find more difficult – there’s no point if you already know them!</li>
                </ul>
            </Paragraph>

            <Paragraph>
                <b>What should my poster be like?</b>
                <ul>
                    <li>Write the word really big in the middle so you can see it clearly from a distance.</li>

                    <li>
                        Decorate the word so it looks fancy. You could also think about what the word means and use that to give you
                        decorating ideas. There might also be a group of letters you want to do in a different colour so they stand out.
                    </li>
                    <li>
                        You can write smaller things around it that help you remember the spelling. Maybe you have a rhyme you say to help
                        you remember, or maybe there is a something else you really want to think about.
                    </li>
                    <li>Your poster can look like whatever you want, as long as it helps you think about and remember the spelling.</li>
                    <li>Make sure you have spelled the word correctly on your poster!!!</li>
                </ul>
            </Paragraph>

            <br />

            <Paragraph>
                <b>What should I do with my poster when it is finished?</b>
                <ul>
                    <li>
                        Put it somewhere you will see it often. Every time you look at it, the poster will help the spelling stick in your
                        head!
                    </li>
                </ul>
            </Paragraph>
            <br />
            <br />
        </div>
    );
};

export default SpellingPosters;
