/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const UpTheDictionary = () => {
    return (
        <div className="happy_birthday chair_in_the_world UpTheDictionary">
            <Heading1 centerText text="Up the Dictionary" />

            <Divider customClass="mt7 mb5" />

            <Paragraph>
                In this game, you will use your knowledge of the alphabet to think of words and try to beat the other player!
            </Paragraph>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />

            <ol>
                <li>Player 1 thinks of a five-letter word beginning with A, e.g. “acorn”.</li>
                <li>Player 2 thinks of another five-letter word that follows these two rules:</li>
                <li className="hide_marker">
                    <ul>
                        <li>a. It comes later in the dictionary than the previous word;</li>
                        <li>
                            b. It contains at least one “crash” with the previous word (it has one letter the same in the same position in
                            the word). For example, “broth” could follow “acorn” because it has an “o” as its third letter.
                        </li>
                    </ul>
                </li>
                <li>
                    Player 2 then thinks of another word following these two rules, e.g. “couch” could follow “broth” because it has an “h”
                    as its fifth letter.
                </li>
                <li>Keep taking it in turns to think of another word. The winner is the last player who is able to say a word.</li>
            </ol>

            <br />

            <div
                className="buble_conainer"
                style={{
                    backgroundImage: `url(${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Ellipse7.png)`
                }}>
                <Heading1 customClass="sub_heading" centerText text="Example game" />
                <div className="discription">
                    <Paragraph>ACORN</Paragraph>
                    <Paragraph>BROTH (o in the same place)</Paragraph>
                    <Paragraph>COUCH (h in the same place)</Paragraph>
                    <Paragraph>RETCH (c and h in the same place)</Paragraph>
                    <Paragraph>ZEBRA (e in the same place)</Paragraph>
                    <Paragraph>ZOOMS (z in the same place)</Paragraph>
                </div>
            </div>

            <div className="img_container mt4">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group3.png`}
                    alt="this place"
                />
            </div>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Extra challenge" />

            <br />
            <br />
            <Paragraph>
                Add these two new rules:
                <ol>
                    <li>Each word is only allowed exactly one crash (letter in common) with the previous word.</li>
                    <li>
                        Each new word must either start with the same letter as the previous word (this would be the only crash allowed), or
                        the next letter in the alphabet.
                    </li>
                </ol>
            </Paragraph>
            <br />
        </div>
    );
};

export default UpTheDictionary;
