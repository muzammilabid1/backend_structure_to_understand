/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const CerealSentences = ({ pupilName }) => {
    return (
        <div className="happy_birthday">
            <Heading1 centerText text="Cereal Sentences" />

            <Divider customClass="my5" />

            <Paragraph>
                Write a sentence. When you&apos;ve finished, put a piece of cereal (or a raisin or a little ball of bluetac) between each
                word to check there is a space!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/CerealSentences.png`}
                    alt="ABC"
                />
            </div>

            <br />
            <br />

            <Paragraph>
                <b>Sentence ideas:</b>
                <br />
                Why not write some facts about you? Write five sentences, checking the spaces after you have finished each one!
            </Paragraph>

            <ul>
                <li>I am {pupilName || 'child name'}.</li>
                <li>I am 5.</li>
                <li>I can jump.</li>
                <li>I am 5.</li>
                <li>I can ___.</li>
                <li>I like ___.</li>
            </ul>

            <br />
        </div>
    );
};

CerealSentences.propTypes = { pupilName: PropTypes.string };

export default CerealSentences;
