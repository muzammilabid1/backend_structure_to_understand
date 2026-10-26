/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import Divider from '../Divider';
import DownloadAlphabetsPDF from '../downloadAlphabetsPDF';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const MakingTheAlphabet = () => {
    return (
        <div className="making_the_alphabet">
            <Heading1 centerText text="Making the Alphabet" />

            <Divider customClass="my5" />

            <Paragraph>
                Use objects you find in the garden (or park) to make the letters of the alphabet. For your first try, use lower case letters
                (but you could have another go with capital letters if your child is keen).
            </Paragraph>

            <br />
            <br />

            <div className="alphabets_images_container">
                {sharedJson?.alphabets_images.map((item) => {
                    return (
                        <img
                            key={item.key}
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item.image}`}
                            alt="alphabet"
                        />
                    );
                })}
            </div>

            <br />
            <br />

            <Paragraph>
                If you can’t go outside, you could try this with objects in the house, or build them out of Lego, or use anything you like!
            </Paragraph>

            <br />

            <Paragraph>
                Look below to see what lower-case letter shapes you should make or click the button below to download and print off a letter
                formation sheet.
            </Paragraph>

            <br />
            <br />

            <DownloadAlphabetsPDF array={sharedJson?.alphabets} />
        </div>
    );
};

export default MakingTheAlphabet;
