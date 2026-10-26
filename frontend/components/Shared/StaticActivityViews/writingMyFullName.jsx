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

const WritingMyFullName = ({ pupilName }) => {
    const [open, setOpen] = useState(false);
    const [modalType, setModalType] = useState('');

    const toggle = (type) => {
        setModalType(type);
        setOpen(true);
    };

    return (
        <div className="happy_birthday rainbow_container spelling_posters">
            <Heading1 centerText text="Writing My Full Name" />

            <Divider customClass="my5" />

            <Paragraph>For this activity, you will need:</Paragraph>
            <ul>
                <li>A pencil (or pen) to write with.</li>
                <li>Lined paper (or a ruler and pencil to draw your own lines).</li>
            </ul>

            <Paragraph>This is how the letters in {pupilName || 'child name'} are written:</Paragraph>

            <Paragraph customClass="big_heading child_name mt8" centerText>
                {pupilName || 'child name'}
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('letter_formation')} btnText="Letter formation" color="inherit" />
            </div>

            <Divider customClass="mt5 mb10" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />

            <br />
            <br />

            <ol>
                <li>On the line, write the capital letter at the start of your first name.</li>
                <li>
                    This capital letter sets the height of all the other letters in your name. Any tall letters will be the same height and
                    any short letters will be about half the height.
                </li>
                <li>
                    Think about the second letter in your name. Is it tall or short? Does it hang below the line? Where will you start the
                    letter to make sure it is the same scale as your first capital letter?
                </li>
                <li>Write the rest of your first name, thinking carefully about the relative height of the letters.</li>
                <li>
                    Leave a space. If your writing is quite small, a finger space will be too big. Leave a space about the same size as you
                    would write a lower-case letter m.
                </li>
                <li>If you have a middle name, write it now (don’t forget the capital letter).</li>
                <li>Leave another m sized space.</li>
                <li>Write your last name (again, remember the capital letter).</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Name.png`}
                    alt="letter in flour"
                />
            </div>

            <br />
            <br />

            <Paragraph>
                <b>What if I find it hard to form my letters correctly?</b>
                <br />
                Don’t worry! It can be tricky to write the letters correctly. Click the button below for some instructions for making a name
                formation sheet to help you practise.
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('name_formation_instructions')} btnText="Name formation instructions" color="inherit" />
            </div>

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={'TOPIC'}
                    className="spelling_posters writing_my_full_name rainbow_container"
                    heading={modalType === 'letter_formation' ? 'Letter Formation' : 'Instructions for making a name formation sheets'}>
                    {modalType === 'letter_formation' ? (
                        <DownloadAlphabetsPDF
                            array={[...sharedJson.alphabets, { text: <br /> }].concat(
                                sharedJson?.alphabets.map((i) => ({ text: i.text.toUpperCase() }))
                            )}
                        />
                    ) : (
                        <>
                            <Paragraph>You will need a thick, pale coloured felt tip and the letter formation sheet.</Paragraph>
                            <Paragraph customClass="big_heading child_name mt8" centerText>
                                {pupilName || 'child name'}
                            </Paragraph>

                            <br />

                            <Paragraph>
                                You can then write your child’s full name several times on a piece of paper using the felt tip. When you
                                have written it, use the letter formation sheet to mark on a dot to show where to start each letter. You
                                don’t need to do this all the way down the page, but it could be useful the first time, and might be needed
                                for trickier letters several times down the page.
                            </Paragraph>

                            <br />

                            <div className="img_container">
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/writing_My_Full_Name.png`}
                                    alt="letter in flour"
                                />
                            </div>
                        </>
                    )}
                </DialogBox>
            )}
        </div>
    );
};

WritingMyFullName.propTypes = { pupilName: PropTypes.string };

export default WritingMyFullName;
