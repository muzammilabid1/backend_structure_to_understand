/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const InterviewingMyFamily = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="interviewing_my_family">
            <Heading1 centerText text="Interviewing my family" />

            <Divider customClass="my5" />

            <Paragraph>
                <b>Your challenge:</b>
                <br />
                Choose an adult in your family (or a family friend) who you could interview about what it was like when they were a child.
                Make sure you choose someone you can talk to easily, either in person or on the phone!
            </Paragraph>

            <Divider customClass="mb5 mt10" />

            <Heading1 customClass="sub_heading" centerText text="Step 1: Plan your questions" />

            <br />

            <ul className="mt0">
                <li>What do you want to find out?</li>
                <li>
                    How will you stop the{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="interviewee">
                            Interviewee: the person the interviewer is asking questions.
                        </CommonPopOver>
                    </div>{' '}
                    giving one-word answers?
                </li>
                <li>Can you think of follow-up questions to get more information if they only give a short answer?</li>
            </ul>

            <br />

            <Paragraph>Click the button below for some question starters.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Question starters" color="inherit" />
            </div>

            <Divider customClass="mb5" />

            <Heading1 customClass="sub_heading" centerText text="Step 2: Use your questions" />

            <br />

            <Paragraph>
                Talk to the person you have chosen, explain what you are trying to find out, and ask your questions. Make a note of their
                answers.
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Interviewingmyfamily.png`}
                    alt="animals"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Extra Challenge" />

            <br />

            <Paragraph>
                Use what you&apos;ve found out to write a report about the person you interviewed and what it was like when they were a
                child.
            </Paragraph>

            <br />

            {open && (
                <DialogBox className="happy_birthday" open={open} setOpen={() => setOpen(!open)} type={type} heading="Question starters">
                    <ul>
                        {sharedJson?.interviewing_my_family.map((item) => (
                            <li>{item}</li>
                        ))}
                    </ul>
                    <Paragraph>You might know some other ways of starting questions too!</Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

InterviewingMyFamily.propTypes = { type: PropTypes.string };

export default InterviewingMyFamily;
