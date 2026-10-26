/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const MinisterCat = () => {
    return (
        <div className="happy_birthday improveIt">
            <Heading1 centerText text="Minister’s Cat" />

            <Divider customClass="my5" />

            <Paragraph>
                In this game, you will be repeating this sentence: The Minister’s cat is a _____ cat. You will take it in turns to think of
                an{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="adjective" childrenClass="typography">
                        Adjective: A word used to describe a noun (object).
                    </CommonPopOver>
                </div>{' '}
                to fill the gap.
            </Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Start by setting up your clapping rhythm. Don’t go too fast and try to keep going at the same speed.</li>
                <li>
                    Player 1 needs to think of an adjective beginning with ‘a’ and use the adjective to describe the cat. Your sentence
                    should fit with the claps, e.g. “The <span className="_span">Min</span>ister’s <span className="_span">cat</span> is an{' '}
                    <span className="_span">aw</span>ful <span className="_span">cat</span>.” (The orange bits are the parts of the words
                    which happen at the same time as the four claps).
                </li>
                <li>Clap another four claps.</li>
                <li>
                    Player 2 does the same, but with an adjective beginning with ‘b’, e.g. “The <span className="_span">Min</span>ister’s{' '}
                    <span className="_span">cat</span> is a <span className="_span">beau</span>tiful <span className="_span">cat</span>.”
                </li>
                <li>Clap another four claps.</li>
                <li>Take it in turns to do each letter of the alphabet up to ‘z’.</li>
            </ol>

            <br />
            <br />

            <Paragraph>
                <b>Example:</b> <br />
                CLAP CLAP CLAP CLAP
                <br />
                Player 1: The <span className="_span">Min</span>ister’s <span className="_span">cat</span> is an{' '}
                <span className="_span">aw</span>ful <span className="_span">cat</span>.
                <br />
                CLAP CLAP CLAP CLAP
                <br />
                Player 2: The <span className="_span">Min</span>ister’s <span className="_span">cat</span> is a{' '}
                <span className="_span">beau</span>tiful <span className="_span">cat</span>.
                <br />
                CLAP CLAP CLAP CLAP
                <br />
                Player 1: The <span className="_span">Min</span>ister’s <span className="_span">cat</span> is an{' '}
                <span className="_span">cl</span>ever <span className="_span">cat</span>.
                <br />
                CLAP CLAP CLAP CLAP
                <br />
                Player 2: The <span className="_span">Min</span>ister’s <span className="_span">cat</span> is an{' '}
                <span className="_span">dan</span>gerous <span className="_span">cat</span>.
                <br />
                CLAP CLAP CLAP CLAP
                <br />
                Etc
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/minister_cat.png`}
                    alt="minister cat"
                />
            </div>

            <br />

            <Paragraph>
                <b>Too hard?</b>
                <br />
                Try without the clapping to take the pressure off! You can also figure out what your next letter will be and choose an
                adjective in your head before it’s your turn.
            </Paragraph>

            <br />

            <Paragraph>
                <b>Too easy?</b>
                <br />
                Make it competitive – if you don’t say your adjective at the right time, you lose a point. After the four claps, the next
                player must think of an adjective using the letter you missed. You then carry on with the next letter. The person with the
                fewest lost points at the end wins!
            </Paragraph>

            <br />
            <br />
        </div>
    );
};

export default MinisterCat;
