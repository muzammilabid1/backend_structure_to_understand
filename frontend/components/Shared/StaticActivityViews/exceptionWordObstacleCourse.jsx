/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const ExceptionWordObstacleCourse = () => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="Exception word Obstacle Course" />

            <Divider customClass="my5" />

            <Paragraph>
                For this activity you need to set up an obstacle course in your house (or the garden). You could use cushions, blankets,
                chairs etc.
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />

            <br />
            <br />

            <ol>
                <li>
                    Choose ten words to use in the activity (choose from the{' '}
                    <Link passHref href={'/assets/pdf-files/CommonExceptionWords.pdf'}>
                        <a href={'/assets/pdf-files/CommonExceptionWords.pdf'} target="_blank" className="link">
                            <u>cards you used in Activity 1</u>
                        </a>
                    </Link>
                    ).
                </li>
                <li>Write a list of the ten words (or have your grownup take a quick photo on their phone).</li>
                <li>Label each obstacle with one of the ten words.</li>
                <li>Start a stopwatch (maybe on your grownup’s phone)</li>
                <li>Go round the obstacle course as fast as you can</li>
                <li>Every time you get to a word, read it out and your grownup can tick it off the list.</li>
                <li>Stop the timer when you have read all ten words. How long did it take you?</li>
                <li>Have another go and see if you can do it faster!</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/exception_word_obstacle.png`}
                    alt="rsilly answers"
                />
            </div>

            <br />
            <br />
        </div>
    );
};

export default ExceptionWordObstacleCourse;
