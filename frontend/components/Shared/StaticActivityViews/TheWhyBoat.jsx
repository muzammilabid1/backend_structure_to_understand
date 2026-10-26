/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
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

const TheWhyBoat = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="the_why_boat">
            <Heading1 centerText text="The Why Boat" />

            <Divider customClass="my5" />

            <Paragraph>
                In this activity, you will be making a boat and then using{' '}
                <div className="pop_over">
                    <CommonPopOver hover childrenClass="typography" text="why">
                        Why: Helps you talk about the reason something happens.
                    </CommonPopOver>
                </div>{' '}
                questions to think about how well it works.
            </Paragraph>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="What to do" />

            <br />

            <ol>
                <li>Gather together your materials (click the button below to see some ideas).</li>
                <li>Explain the activity: we are going to make a boat and see if it floats in the bath (or sink or tub).</li>
                <li>
                    Work together to make the boat. Let your child take the lead but do join in! Remember that this activity can be just as
                    fun if the boat sinks, and you might have more interesting answers to the questions. While you are building, ask some
                    ‘why’ questions, e.g. <b>Why are you making it that shape?</b> Or <b>Why are you sticking that there?</b>
                </li>
                <li>
                    When the boat is finished, ask your child: <b>Do you think the boat will float? Why?</b>
                </li>
                <li>
                    Test the boat! Did it float or sink or something in between? Ask your child <b>Why do you think it floated/sunk?</b> You
                    could also ask some other ‘why’ questions, e.g. <b>Why do you think the water came in there first?</b> Or{' '}
                    <b>Why did it suddenly tip over like that?</b>
                </li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Materials you could use to make a boat" color="inherit" />
            </div>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/TheWhyBoat.png`}
                    alt="animals"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Extra things you could do afterwards" />

            <ul>
                <li>
                    If it sunk, you could try making another boat which might float better, asking ‘why’ you are doing particular bits
                    differently, like you did in step 3 above.
                </li>
                <li>
                    If it floated, you could add a cargo (something for the boat to carry) and then ask some of the ‘why’ questions in steps
                    4 and 5 above.
                </li>
            </ul>

            {open && (
                <DialogBox
                    className="the_why_boat_dialog"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading="Materials you could use to make a boat">
                    <ul>
                        <li>Plasticine or blu tack</li>
                        <li>Junk modelling (cardboard boxes, plastic food trays, tape, toilet roll tubes etc)</li>
                        <li>Origami (folding paper)</li>
                    </ul>

                    <br />

                    <Grid container alignItems="flex-end">
                        {sharedJson?.the_why_boat_items.map((item) => {
                            const bool = item.key === 10;

                            return (
                                <Grid className="card_body" item xs={12} md={bool ? 12 : 4} lg={bool ? 12 : 4}>
                                    <img
                                        className={!bool ? 'card_img' : 'last_card_img'}
                                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item.image}`}
                                        alt={item.key}
                                    />
                                    <Paragraph customClass="title" text={item.caption} />
                                </Grid>
                            );
                        })}
                    </Grid>
                </DialogBox>
            )}
        </div>
    );
};

TheWhyBoat.propTypes = { type: PropTypes.string };

export default TheWhyBoat;
