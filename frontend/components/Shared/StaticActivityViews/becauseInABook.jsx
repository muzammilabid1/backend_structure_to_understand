/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const BecauseInABook = () => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="Because in a Book" />

            <Divider customClass="my5" />

            <Paragraph>Read a story together, then take it in turns to ask questions that could be answered using ‘because’.</Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group.png`}
                    alt="Mask Group"
                />
            </div>

            <Divider customClass="my10" />
            <Heading1 customClass="sub_heading" centerText text="What questions should I ask?" />
            <br />
            <br />

            <Paragraph>‘Why’ is a good question starter, for example:</Paragraph>

            <br />

            <ul>
                <li>
                    <b>Question:</b> &quot;Why did Cinderella want to go to the ball?&quot;
                </li>
                <li>
                    <b>Answer:</b> &quot;Cinderella wanted to go to the ball <span className="_span_red">because</span> she had received an
                    invitation and an evening of dancing sounded fun to her.&quot;
                </li>
            </ul>

            <Paragraph>
                Try to say whole sentences for the answer, as in the example.
                <br />
                <br />
                The questions don&apos;t need to have answers you know from the book, they could also be inference questions. An inference
                is a bit like a guess, but you don’t totally make up your answer. Instead, you use clues from what you have seen in the
                pictures or read to give a sensible answer which fits with the story.
                <br />
                <br />
                Example inference question:
            </Paragraph>

            <br />
            <br />

            <ul>
                <li>
                    <b>Question:</b> &quot;Why were the Ugly Sisters so mean?&quot;
                </li>
                <li>
                    <b>One possible answer:</b> &quot;I think the Ugly Sisters were mean <span className="_span_red">because</span> they
                    were envious of Cinderella’s good looks and they didn’t want to be compared to her.&quot;
                </li>
            </ul>

            <br />
        </div>
    );
};

export default BecauseInABook;
