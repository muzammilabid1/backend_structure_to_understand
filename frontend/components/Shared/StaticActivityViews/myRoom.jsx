/* eslint-disable @next/next/no-img-element */
import { Card, Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { getTopicType } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import DownloadAlphabetsPDF from '../downloadAlphabetsPDF';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const MyRoom = ({ type, readOnly }) => {
    const [open, setOpen] = useState(false);
    const [dialogType, setDialogType] = useState('');

    const toggle = (type) => {
        setOpen(!open);
        setDialogType(type);
    };

    return (
        <div className="happy_birthday">
            <Heading1 centerText text="My Room" />

            <Divider customClass="my5" />

            <Paragraph>For this activity you will need:</Paragraph>
            <ul>
                <li>Card, maybe from a cereal box</li>
                <li>Scissors</li>
                <li>Something to write with</li>
                <li>Something to decorate it with</li>
            </ul>

            <Paragraph>Click the button below for some ideas.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('mySign')} btnText="Decoration ideas" />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="The activity" />

            <br />
            <br />

            <Paragraph>Make a sign with your name on to label the door of your room.</Paragraph>

            <br />

            <ol>
                <li>Draw a big rectangle on your piece of card (or another shape if you’re feeling fancy).</li>
                <li>Cut it out.</li>
                <li>
                    Write your name in big writing in the middle of your card (if you share a room with someone else, you could both your
                    names, or they could make their own sign to go next to yours). Think carefully about which letters you need and which
                    way round they need to go!
                </li>
                <li>Decorate your sign.</li>
            </ol>

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/my_room.png`} alt="my room" />
            </div>

            <br />
            <br />

            <Paragraph>Click the button below to check the letter formation.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('letterformation')} btnText="Letter formation" color="inherit" />
            </div>

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    className="my_room_activity_container"
                    heading={dialogType === 'mySign' ? 'How could I decorate my sign?' : 'Letter Formation'}>
                    {dialogType === 'mySign' ? (
                        <>
                            <Grid container spacing="4">
                                {(sharedJson?.mySigns || []).map((item) => {
                                    return (
                                        <Grid key={item.key} xs={12} sm={6} md={6} lg={3} item>
                                            <Card
                                                className={`my_room_check_box_card top-${getTopicType(type)}-border`}
                                                style={{ pointerEvents: readOnly ? 'none' : '' }}>
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item.image}`}
                                                    alt="check box"
                                                />
                                                <Paragraph>{item.caption}</Paragraph>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>

                            <Divider customClass="my10" />
                            <Heading1 customClass="sub_heading" centerText text="How to make coloured rice" />

                            <Paragraph>
                                <i>
                                    It can take some time to dry, so you might want to prepare it in advance. This is a fun activity to do
                                    together though, and includes some weighing and measuring, so get your child involved too for some extra
                                    maths practice!
                                </i>
                            </Paragraph>

                            <br />
                            <br />

                            <Paragraph>For each colour, you will need:</Paragraph>
                            <ul>
                                <li>1 cup or 200g of dry brown or white rice</li>
                                <li>1 teaspoon of vinegar (optional but it can help set the colour)</li>
                                <li>1/8 teaspoon of food colouring</li>
                                <li>A ziplock bag or a bowl and spoon for mixing or even a large jar</li>
                                <li>A ziplock bag or a bowl and spoon for mixing or even a large jar</li>
                                <li>A tray or flat surface for drying</li>
                                <li>Paper towels to lie on your tray (optional)</li>
                            </ul>

                            <br />

                            <Paragraph>What to do:</Paragraph>
                            <ol>
                                <li>Put the rice in your ziplock bag (or bowl).</li>
                                <li>Add the vinegar (if you’re using it).</li>
                                <li>Add the food colouring.</li>
                                <li>
                                    If you are using a bag, seal it shut and then squidge it around to mix. In a bowl, use your spoon to mix
                                    instead.
                                </li>
                                <li>Once the colour is well mixed, you can add more if you want it a bit brighter.</li>
                                <li>
                                    When it is all mixed, spread the rice out on your tray to dry. Spreading it out helps it dry quicker.
                                    Using a paper towel can also speed up the drying time.
                                </li>
                                <li>Leave the rice to dry. It will take between two hours and a whole day, depending on the weather.</li>
                            </ol>

                            <br />

                            <Paragraph>
                                You can make more than one colour if you have several colours of food colouring! Or, you could use a mixture
                                of plain and dyed rice to make a pattern.
                            </Paragraph>

                            <br />

                            <Paragraph>
                                Once the rice is dry, it keeps for ages. You can glue it down for decorating your sign, but you can also use
                                any leftovers for all sorts of things. Here are some ideas:
                            </Paragraph>
                            <ul>
                                <li>Put it in a plastic tub or tray with some toy animals or mini figures.</li>
                                <li>Put it out with scoops and tubs and measuring jugs for scooping and pouring.</li>
                                <li>Put it in a tub and hide small toys in it to find.</li>
                            </ul>
                        </>
                    ) : (
                        <DownloadAlphabetsPDF
                            array={[...sharedJson.alphabets, { text: <br /> }].concat(
                                sharedJson?.alphabets.map((i) => ({ text: i.text.toUpperCase() }))
                            )}
                        />
                    )}
                </DialogBox>
            )}
        </div>
    );
};

MyRoom.propTypes = { type: PropTypes.string, readOnly: PropTypes.bool };

export default MyRoom;
