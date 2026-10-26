/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SillyAnswers = () => {
    return (
        <div className="happy_birthday the_questions_game">
            <Heading1 centerText text="Silly Answers" />

            <Divider customClass="my5" />

            <Paragraph>For this game, you will need two pieces of paper and two pencils (or pens) to write with.</Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />

            <ol>
                <li>
                    One person writes a{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="questions!">
                            Question: A question sentence is used to ask something, usually to find out information. It ends with a question
                            mark. Common words used to start questions include who, what, where, when, how and why.
                        </CommonPopOver>
                    </div>{' '}
                    beginning &quot;<span className="_span">Why</span>&quot;, e.g. &quot;<span className="_span">Why</span> do leaves fall
                    off trees in autumn?&quot; Don’t forget to put a question mark at the end!
                </li>
                <li>
                    The other person, on a separate piece of paper, writes an answer beginning with &quot;
                    <span className="_span_green">This is because</span>&quot; (without knowing what the question is), e.g. &quot;
                    <span className="_span_green">This is because</span> most kittens prefer cosy places to sleep.&quot; Don’t forget to put
                    a full stop at the end!
                </li>
                <li>Then put the question and answer together and see what you get!</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/silly_answers.png`}
                    alt="rsilly answers"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />

            <br />

            <Paragraph>
                Choose a different question word to start your sentence and tell the answer writer what your question word is before they
                write their answer, e.g. &quot;When will we eat tea today?&quot; &quot;It happened over a million years ago.&quot;
            </Paragraph>

            <br />

            <Paragraph>Other question words you could use: when, who, what, where, how…</Paragraph>

            <br />
        </div>
    );
};

export default SillyAnswers;
