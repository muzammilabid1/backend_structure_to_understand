/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const TheTravellingAlphabet = () => {
    return (
        <div className="happy_birthday improveIt TheTravellingAlphabet">
            <Heading1 centerText text="The Travelling Alphabet" />

            <Divider customClass="my5" />
            <Paragraph>
                <b>How To Play:</b>
            </Paragraph>
            <ol>
                <li>Player 1 says they are going on a journey to a place beginning with A, e.g. “I am going to Amsterdam.”</li>
                <li>Player 2 asks what they are doing there: “What will you do in Amsterdam?”</li>
                <li>
                    Player 1 replies with a{' '}
                    <div className="pop_over _span_custom ">
                        <CommonPopOver hover text="verb">
                            Verb: Also known as a doing word.
                        </CommonPopOver>
                    </div>{' '}
                    ,{' '}
                    <div className="pop_over _span_custom_green ">
                        <CommonPopOver hover text="adjective">
                            Adjective: Used to describe a noun.{' '}
                        </CommonPopOver>
                    </div>{' '}
                    and{' '}
                    <div className="pop_over _span_custom_blue ">
                        <CommonPopOver hover text="noun">
                            Noun: The name of something.{' '}
                        </CommonPopOver>
                    </div>{' '}
                    <span className="_span"></span>
                    (beginning with A) to say what they are doing, e.g. “I will <span className="_span">adopt</span>{' '}
                    <span className="_span_green">amazing</span> <span className="_span_blue">aardvarks</span>.”
                </li>
                <li>Player 2 then thinks of a place beginning with B, e.g. “I am to Birmingham.”</li>
                <li>Player 1 asks: “What will you do in Birmingham?”</li>
                <li>
                    Player 2 replies with a <span className="_span">verb</span>, <span className="_span_green">adjective</span> and{' '}
                    <span className="_span_blue">noun</span> (beginning with B). e.g. “I will <span className="_span">bake</span>{' '}
                    <span className="_span_green">boring</span> <span className="_span_blue">biscuits</span>.”
                </li>
                <li>Keep taking it in turns with all the letters of the alphabet up to Z.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/suitcases.png`}
                    alt="this place"
                />
            </div>

            <br />
        </div>
    );
};

export default TheTravellingAlphabet;
