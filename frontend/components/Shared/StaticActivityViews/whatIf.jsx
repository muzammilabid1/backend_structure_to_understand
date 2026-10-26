/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import Divider from '../Divider';
import ReactCarousel from '../ReactCarousel';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const WhatIf = () => {
    return (
        <div className="WhatIf">
            <Heading1 centerText text="What if…?" />

            <Divider customClass="my5" />

            <Heading1 customClass="big_heading" centerText text="What if children made all the rules…?" />
            <br />

            <Paragraph>
                Both people have two minutes to think about the question. Imagine what would happen and what it would be like. Think about
                the little details you might like to tell the other person.
                <br />
                <br />
                When the two minutes are up, take it in turns to explain what you think it would be like. Try to give a detailed
                explanation!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group4.png`}
                    alt="this place"
                />
            </div>
            <br />
            <br />

            <Paragraph>
                See below for some more “what if….?” scenarios you could think about. Use the left and right arrow buttons on the card to
                scroll through the different questions.
            </Paragraph>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="What if scenarios" />
            <br />

            <ReactCarousel array={sharedJson?.whatIfCarouselTitles} />
        </div>
    );
};

export default WhatIf;
