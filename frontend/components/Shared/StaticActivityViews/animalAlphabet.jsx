/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const AnimalAlphabet = () => {
    return (
        <div>
            <Heading1 centerText text="Animal Alphabet" />

            <Divider customClass="mt5 mb8" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 1" />

            <br />

            <Paragraph>Work together to think of an animal beginning with each letter of the alphabet.</Paragraph>

            <Divider customClass="mt5 mb8" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 2" />

            <br />

            <Paragraph>
                Try adding adjectives when you think of your animals, e.g. amazing aardvarks, blue butterflies, cuddly cats etc.
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/animalAlphabet.png`}
                    alt="animal alphabet"
                />
            </div>

            <Divider customClass="mt5 mb8" />

            <Heading1 customClass="sub_heading" centerText text="Other things to try" />

            <ul>
                <li>Make it competitive by taking it in turns to think of the next animal.</li>
                <li>
                    Add in{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="verbs">
                            Verbs: these are also known as “doing words” because they tell you what something is doing, e.g. ‘ran’ or
                            ‘jumped’.
                        </CommonPopOver>
                    </div>{' '}
                    as well as{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="adjectives">
                            Adjectives: words used to describe nouns (objects) e.g. big, freezing, amazing, or red.
                        </CommonPopOver>
                    </div>
                    , e.g. acting with angry anteaters, bouncing with beautiful bees, etc.
                </li>
                <li>Think of a different category instead of animals, e.g. foods.</li>
            </ul>
        </div>
    );
};

export default AnimalAlphabet;
