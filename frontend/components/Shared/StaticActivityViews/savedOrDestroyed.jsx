/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const SavedOrDestroyed = () => {
    return (
        <div className="happy_birthday improveIt what_is">
            <Heading1 centerText text="Saved or Destroyed" />
            <br />
            <Divider customClass=" mb5" />
            <Paragraph>
                <b>You will need:</b>
                <ul>
                    <li>A sheet of plain paper</li>
                    <li>Something to draw with</li>
                </ul>
            </Paragraph>
            <Divider customClass=" mb5" />
            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />

            <ol>
                <li>Player 1 draws the main character at the start of the page. </li>
                <li>
                    Player 2 thinks of a way to stop the character. It could be anything you like, something small like receiving an
                    invitation to a party, a hole to fall down, or a rocket coming to destroy them. It’s up to you! Draw your thing after
                    the arrow. Write a number 1 next to it.
                </li>
                <li>
                    Player 1 thinks of a way to prevent the destruction from happening. Be as creative as you like! Draw it and write number
                    2.
                </li>
                <li>Player 2 thinks of a way of stopping Player 1’s action and draws it.</li>
                <li>
                    Keep going until you fill up the page. When there is no more space, go through all your pictures to find out if your
                    character was saved or destroyed!
                </li>
            </ol>

            <div className="img_container mb4">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Saveddestroyedexampletrimmed1.png`}
                    alt="this place"
                />
            </div>

            <br />

            <Paragraph>
                <b>Tips:</b>
                <br />
                <ul>
                    <li>Don’t draw in silence, tell the story of what is happening as you draw!</li>
                    <li>
                        The game can’t end before the space runs out, so make sure the other player will be able to stop your thing. It’s a
                        bit boring if the universe ends in the third picture and the game ends there…
                    </li>
                </ul>
            </Paragraph>
            <Divider customClass=" mb5" />
            <Heading1 customClass="sub_heading" centerText text="Alternative ways to play" />
            <br />
            <Paragraph>
                You can also play by drawing your main character in the middle of the page and add to the drawing each turn creating a whole
                picture rather than a series of steps. This can look a bit more artistic in the end though is harder to retell as a logical
                series of steps. Have a go at this version and see which you prefer!
            </Paragraph>
            <br />
        </div>
    );
};

export default SavedOrDestroyed;
