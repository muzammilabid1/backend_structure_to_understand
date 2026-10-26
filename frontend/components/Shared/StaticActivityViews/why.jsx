/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import Divider from '../Divider';
import ReactCarousel from '../ReactCarousel';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const Why = () => {
    return (
        <div className="why">
            <Heading1 centerText text="Why…?" />

            <Divider customClass="my5" />

            <Paragraph>
                In this activity, you will be making hypotheses about things. That means thinking about explanations for why something is
                like it is, using what you know but not necessarily finding the right answer. You don’t need to look up the real answer
                (unless you want to once you’ve finished) – this is about your ideas and how you explain them to someone else.
            </Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />
            <br />

            <ol>
                <li>
                    Choose one of the ‘why’ questions together, (scroll to the bottom of the activity to see them. Use the left and right
                    arrow buttons on the card to scroll through the different questions).
                </li>
                <li>Both people should spend a bit of time thinking about what the answer could be.</li>
                <li>Take it in turns to explain what you think the answer could be, making sure to explain your reasoning.</li>
                <li>
                    Once both people have shared their hypothesis, discuss together which hypothesis seems more likely. Perhaps they both
                    have good bits!
                </li>
            </ol>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="‘Why’ questions to think about" />
            <br />

            <ReactCarousel array={sharedJson?.whyCarouselTitles} />

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/screwdrivers1.png`}
                    alt="this place"
                />
            </div>
            <br />

            <Paragraph>
                If you have another go of this activity, you could choose another question from the list or you could ask an interesting
                question of your own.
            </Paragraph>
            <br />
        </div>
    );
};

export default Why;
