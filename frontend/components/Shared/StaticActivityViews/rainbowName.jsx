/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import DownloadAlphabetsPDF from '../downloadAlphabetsPDF';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const RainbowName = ({ pupilName, type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday spelling_posters rainbow_container">
            <Heading1 centerText text="Rainbow name" />

            <Divider customClass="my5" />

            <Paragraph>For this activity you will need:</Paragraph>
            <ul>
                <li>Something to write on (a piece of paper or even the inside of a cereal box)</li>
                <li>Lots of coloured pens or pencils</li>
            </ul>

            <br />

            <Paragraph>
                For all these challenges, you will need to watch your child to help them remember to form the letters correctly. This means
                that their pen starts in the right place and travels in the correct direction around each letter. See the letter formations
                below or click the button below to download a letter formation sheet for help.
            </Paragraph>

            <Paragraph customClass="big_heading child_name mt8" centerText>
                {pupilName || 'child name'}
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Letter formation" color="inherit" />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 1: Trace your name" />
            <br />
            <br />

            <ol>
                <li>Ask your grownup to write your name in a pale colour.</li>
                <li>
                    Choose a different colour and write over their writing (your grownup should keep an eye to make sure your pen is
                    travelling in the correct direction around the letters).
                </li>
                <li>Keep choosing different colours to go over the whole word until your name looks like a rainbow!</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/rainbow_name.png`}
                    alt="rainbow name"
                />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 2: Copy your name." />
            <br />
            <br />

            <ol>
                <li>Ask your adult to write your name again.</li>
                <li>Copy it underneath.</li>
                <li>Did you get all the letters the same way round?</li>
                <li>Did your pen travel in the correct direction around the letters?</li>
            </ol>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 3: Write your name from memory" />
            <br />
            <br />

            <ol>
                <li>On a new piece of paper, write your name without copying.</li>
                <li>Did you remember all the letters?</li>
                <li>Were they in the right order?</li>
                <li>Did you get all the letters the correct way round?</li>
                <li>Did your pen travel in the correct direction around the letters?</li>
                <li>If it wasn’t quite right, have another go at copying your name!</li>
            </ol>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge 4: Write your name on a line" />
            <br />
            <br />

            <ol>
                <li>Use a ruler to draw a line across the paper (you will need a grownup to help).</li>
                <li>Ask your grownup to write your name on the line.</li>
                <li>Trace over your name. Which letters were tall? Which letters hung under the line?</li>
                <li>
                    Write your name again on the line, next to the first version. Think carefully about which letters are tall, which are
                    short, and if any hang under the line.
                </li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/rainbow_name2.png`}
                    alt="rainbow name"
                />
            </div>

            <br />
            <br />

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Letter Formation">
                    <DownloadAlphabetsPDF
                        array={[...sharedJson.alphabets, { text: <br /> }].concat(
                            sharedJson?.alphabets.map((i) => ({ text: i.text.toUpperCase() }))
                        )}
                    />
                </DialogBox>
            )}
        </div>
    );
};

RainbowName.propTypes = { pupilName: PropTypes.string, type: PropTypes.string };

export default RainbowName;
