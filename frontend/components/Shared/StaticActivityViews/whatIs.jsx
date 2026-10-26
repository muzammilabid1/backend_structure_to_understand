/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const WhatIs = () => {
    return (
        <div className="happy_birthday improveIt what_is">
            <Heading1 centerText text="What is…?" />
            <br />

            <Divider customClass="mb5" />

            <Paragraph customClass="choose_one">
                Choose one of these{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="abstract nouns">
                        Abstract nouns: things or ideas which have no physical form. ‘Love’ is an abstract noun because we know what it is
                        but you can’t actually see it.
                    </CommonPopOver>
                </div>
                :
            </Paragraph>
            <ul>
                <li>Love</li>
                <li>Fear</li>
                <li>Anger</li>
                <li>Happiness</li>
            </ul>
            <Paragraph>
                Ask the question ‘What is…?’
                <br />
                <br />
                Both spend some time thinking, then take it in turns to share your explanation.
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group6.png`}
                    alt="this place"
                />
            </div>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />
            <br />

            <Paragraph>
                Use your ideas to write a poem. You could compose it orally first (this means saying the words out loud before you write
                them down).
            </Paragraph>
            <br />
        </div>
    );
};

export default WhatIs;
