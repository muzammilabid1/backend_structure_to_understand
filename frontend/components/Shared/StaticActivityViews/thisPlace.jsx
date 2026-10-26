/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const ThisPlace = () => {
    return (
        <div className="happy_birthday improveIt">
            <Heading1 centerText text="This Place" />

            <Divider customClass="my5" />

            <Paragraph>
                In this game, you will take it in turns to{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="describe">
                        Describe: use words to help the other person imagine what you are imagining.
                    </CommonPopOver>
                </div>{' '}
                a place for the other person to guess. Make sure you choose a place you both know! It could be a place you’ve both been or
                it could be a fictional place you have both read about or seen in a film or on TV.
            </Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Player 1 chooses a place (don’t tell the other person).</li>
                <li>Player 1 shuts their eyes to help them really imagine what the place is like.</li>
                <li>
                    Player 1 describes the place while Player 2 listens. Try to use lots of{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="adjectives">
                            Adjectives: words used to describe nouns (objects) e.g. big, freezing, amazing, or red.
                        </CommonPopOver>
                    </div>{' '}
                    to help them get a picture in their head.
                </li>
                <li>When Player 1 has finished describing, Player 2 guesses where they were describing.</li>
                <li>
                    If Player 2 does not manage to guess, Player 1 should add some more description. Perhaps you could think about the
                    sounds you can hear, smells, or how hot or cold it is.
                </li>
                <li>Player 2 tries to guess again. If they still can’t guess, they can ask questions to help them work it out.</li>
                <li>Once Player 2 has guessed correctly, swap over to give the other person a chance to describe a place.</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/this_place.png`}
                    alt="this place"
                />
            </div>

            <br />
            <br />
        </div>
    );
};

export default ThisPlace;
