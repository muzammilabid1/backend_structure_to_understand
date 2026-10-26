/* eslint-disable @next/next/no-img-element */
import { useMediaQuery, useTheme } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import Divider from '../Divider';
import ReactCarousel from '../ReactCarousel';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SpotTheDifference = () => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <div className="happy_birthday good_and_bad spot_the_difference">
            <Heading1 centerText text="Spot the Difference" />

            <Divider customClass="my5" />

            <Paragraph centerText customClass="big_heading">
                Big Large Colossal
            </Paragraph>

            {!matches && (
                <>
                    <br />

                    <Paragraph>Read the words and think about these questions:</Paragraph>
                    <ul>
                        <li>What do these words mean?</li>
                        <li>Do they all mean the same thing?</li>
                        <li>What is different about their meanings?</li>
                        <li>Why do we have all these words?</li>
                    </ul>
                </>
            )}

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/spot_the_difference.png`}
                    alt="spelling posters"
                />
            </div>

            <br />

            <Paragraph>Click the left and right buttons below to go through some more groups of words you could think about:</Paragraph>

            <br />

            <Paragraph>You could have a go at thinking of other sets of words!</Paragraph>

            <br />

            {matches && (
                <>
                    <Divider customClass="mt7 mb10" />
                    <Heading1 customClass="sub_heading" centerText text="More sentences for changing the “said” word" />
                    <br />
                    <Paragraph centerText>You could have a go at thinking of other sets of words!</Paragraph>
                    <Divider customClass="my5" />
                </>
            )}

            <ReactCarousel array={sharedJson?.spellingPostersCarouselTitles} />
        </div>
    );
};

export default SpotTheDifference;
