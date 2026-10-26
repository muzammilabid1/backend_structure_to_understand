/* eslint-disable @next/next/no-img-element */
import { useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import ReactCarousel from '../ReactCarousel';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SaidSwap = () => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <div className="happy_birthday improveIt SaidSwap">
            <Heading1 centerText text="Said Swap" />
            <br />

            <Divider customClass=" mb5" />

            <Heading1 customClass="big_heading" centerText text="“Think carefully!” said the man." />

            <br />
            <br />

            <Paragraph>
                <b>What to do:</b>
            </Paragraph>

            <ol>
                <li>Look at the sentence above.</li>
                <li>Read it aloud.</li>
                <li>Change the “said” word.</li>
                <li>
                    Say the new sentence. How has the{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="effect">
                            Effect: The effect is how your language choices influence the way a reader responds to your writing. The effect
                            might be scary or exciting or something else. A good way of thinking about effect is the emotion you want your
                            writing to make the reader feel.
                        </CommonPopOver>
                    </div>{' '}
                    changed?
                </li>
                <li>Try changing the “said” word in different ways to see how you can change the effect.</li>
            </ol>

            <br />
            <br />

            <Paragraph>Suggestions of effects you might change it to:</Paragraph>

            <ul>
                <li>Scary</li>
                <li>Exciting</li>
                <li>Gloomy</li>
                <li>Sad</li>
                <li>Boring</li>
            </ul>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/speechbubbles1.png`}
                    alt="this place"
                />
            </div>
            <br />

            <Paragraph>
                See below for some more sentences you could look at. Click the left and right buttons to scroll through different options.
            </Paragraph>

            <Divider customClass="my5" />

            <br />

            <Heading1 customClass="sub_heading" centerText text="More sentences for changing the “said” word" />

            <br />

            <ReactCarousel array={sharedJson?.saidSwapCarouselTitles} />

            {matches && (
                <>
                    <Paragraph centerText>You could have a go at thinking of other sets of words!</Paragraph>
                    <br />
                </>
            )}
        </div>
    );
};

export default SaidSwap;
