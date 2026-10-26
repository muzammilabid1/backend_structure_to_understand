import { range } from 'lodash';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import DiceComponent from '../Dice';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const DrawIt = () => {
    return (
        <div className="happy_birthday good_and_bad spelling_posters draw_it">
            <Heading1 centerText text="Draw It!" />
            <Divider customClass="mt7 mb5" />

            <Paragraph>
                In this activity, one player describes a picture for the other player to draw. You will need paper and something to draw
                with.
            </Paragraph>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>
                    Look at the picture (use the picture dice below or print and cut out the cards if you prefer by clicking the button
                    below). Do not show it to the other person.
                </li>
                <li>
                    Describe it for the other person to draw. Try to describe the shapes rather than naming the parts, e.g. &apos;Draw a
                    rectangle in the middle&apos; not &apos;Draw a door&apos;.
                </li>
                <li>Try not to look at their picture while they are drawing it.</li>
                <li>When they have finished, look at what they have drawn and show them the picture.</li>
                <li>Did they draw it right? How could you have described it better?</li>

                <li>Swap over so that the other person has a go at describing.</li>
            </ol>

            <DiceComponent
                inputArray={[
                    range(1, 13).map((i) => `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/dice${i}.png`)
                ]}
                imgHeightProps="116px"
                imgWidthProps="116px"
                inputType="IMAGE"
            />

            <div className="btn_container">
                <DownloadPDFBtn color="primary" btnText="Printable picture cards" url="/assets/pdf-files/DrawIt.pdf" />
            </div>
        </div>
    );
};

export default DrawIt;
