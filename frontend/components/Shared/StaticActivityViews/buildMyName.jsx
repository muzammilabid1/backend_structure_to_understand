/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import DownloadAlphabetsPDF from '../downloadAlphabetsPDF';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const BuildMyName = ({ pupilName, type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="spelling_posters rainbow_container">
            <Heading1 centerText text="Build My Name" />

            <Divider customClass="my5" />

            <Paragraph>
                For this activity, you will need to go outside into the garden or a park. If you can’t go out, you could try with objects
                from around the house.
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="The Activity" />

            <br />
            <br />

            <Paragraph>
                Find objects and use them to make your name. You could just use sticks, but it can be fun to look for interesting shaped
                things, or to do each letter using a different type of object!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/build_my_name.png`}
                    alt="build my name"
                />
            </div>

            <br />
            <br />

            <Paragraph>
                Remember to use a{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="capital letter" childrenClass="typography">
                        Capital letters: upper-case letters, e.g. ‘E’ or ‘Q’ (not ‘e’ or ‘q’).
                    </CommonPopOver>
                </div>{' '}
                at the start and{' '}
                <div className="pop_over">
                    <CommonPopOver hover text="lower-case" childrenClass="typography">
                        Lower case: another way of saying ‘little letters’ or the letters which are not capital letters.
                    </CommonPopOver>
                </div>{' '}
                letters for the other letters. You can see the letter formations below or click the button to download a printable version.
            </Paragraph>

            <Paragraph customClass="big_heading child_name mt8" centerText>
                {pupilName || 'child name'}
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Letter formation" color="inherit" />
            </div>

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

BuildMyName.propTypes = { pupilName: PropTypes.string, type: PropTypes.string };

export default BuildMyName;
