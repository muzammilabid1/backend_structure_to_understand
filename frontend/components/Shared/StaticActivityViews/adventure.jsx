/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';

const Adventure = () => {
    return (
        <div className="adventure">
            <Heading1 centerText text="Adventure" />

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Part 1: Go on your adventure" />

            <br />

            <div className="list_container">
                <ol>
                    <li>
                        Choose somewhere to go on a walk – it could be to a local park, in the countryside, or around the block you live on.
                    </li>
                    <li>Take something with you which you can use to take photos. A phone is probably easiest.</li>
                    <li>Go on your walk. Take photos of about six interesting things you see on your way. Here are some ideas:</li>
                </ol>
                <ul>
                    <li>The place where you chose to cross a road</li>
                    <li>A bridge you went under</li>
                    <li>Some interesting wildlife you saw</li>
                    <li>A post-box</li>
                    <li>A gate you climbed over</li>
                    <li>A path you chose not to go down</li>
                </ul>
            </div>

            <div className="adventure_img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/adventure1.png`}
                    alt="adventure"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Part 2: When you get home" />

            <br />

            <ol>
                <li>Look through your six photos and talk about your adventure.</li>
                <li>
                    Think of a sentence (or paragraph) to go with each picture that helps to tell the story of your journey. You could write
                    the sentences (or paragraphs) down on paper or you could add text to the photos. Your grownup can help with the writing
                    if you need it!
                </li>
                <li>
                    Share the story of your journey with someone else. You could show pictures to someone who lives in your house or send
                    them to someone in your family who lives in a different house. You choose!
                </li>
            </ol>

            <br />

            <div className="adventure_img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/adventure2.png`}
                    alt="adventure"
                />
            </div>
            <br />
        </div>
    );
};

Adventure.propTypes = { readOnly: PropTypes.bool, subject: PropTypes.string };

export default Adventure;
