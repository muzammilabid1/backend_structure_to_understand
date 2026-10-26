/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const AToZOfSaid = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday good_and_bad">
            <Heading1 centerText text="A-Z of Said" />

            <Divider customClass="mt7 mb5" />

            <Paragraph>
                In this activity, you will work together to think of a word that means “said” for every letter of the alphabet!
            </Paragraph>

            <Divider customClass="mt7 mb5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />

            <ol>
                <li>Write the alphabet down the side of a piece of paper.</li>

                <li>
                    Work your way through the alphabet, thinking of a word for each letter that means “said”, for example S could be for
                    “shouted”.
                </li>

                <li>If you think of more than one word for a letter, you could write both!</li>
            </ol>

            <br />

            <Paragraph>If you get stuck, you can click the button below to have a look at this A-Z.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="A-Z of “said” words" color="inherit" />
            </div>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/a_to_z_of_said.png`}
                    alt="a to z f said"
                />
            </div>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Play competitively" />

            <br />

            <Paragraph>
                Take it in turns to say a “said” word for each letter, working through the alphabet. If you can’t think of a word, you lose
                a point. The person who has lost the fewest points at the end wins!
            </Paragraph>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Extra challenge" />

            <br />

            <Paragraph>Make up an A-Z of invented “said” words. Use each one in a sentence to show what it means. For example:</Paragraph>

            <ul>
                <li>
                    Z: “When shall we three meet again?” <span className="_span">zurbled</span> the witch through the thick layer of cream
                    covering her hot chocolate.
                </li>
            </ul>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} className="activity_modal" heading="A-Z of “said” words">
                    <Paragraph>
                        A asked
                        <br />
                        B begged
                        <br />
                        C called
                        <br />
                        D disagreed
                        <br />
                        E echoed
                        <br />
                        F fretted
                        <br />
                        G guffawed
                        <br />
                        H hissed
                        <br />
                        I implored
                        <br />
                        J joked
                        <br />K{' '}
                        <div className="pop_over">
                            <CommonPopOver hover childrenClass="typography" text="kibitzed">
                                Kibitzed: this is an unusual one – it’s the Yiddish word for “chatted” – it turns out there aren’t many
                                “said” words beginning with K!)
                            </CommonPopOver>
                        </div>{' '}
                        <br />
                        L laughed
                        <br />
                        M moaned
                        <br />
                        N nodded
                        <br />
                        O observed
                        <br />
                        P panted
                        <br />
                        Q quipped
                        <br />
                        R roared
                        <br />
                        S shouted
                        <br />
                        T thundered
                        <br />
                        U urged
                        <br />
                        V vowed
                        <br />
                        W wept
                        <br />X{' '}
                        <div className="pop_over">
                            <CommonPopOver hover childrenClass="typography" text="exclaimed">
                                You can probably cheat here!
                            </CommonPopOver>
                        </div>{' '}
                        <br />
                        Y yawned
                        <br />Z{' '}
                        <div className="pop_over">
                            <CommonPopOver hover childrenClass="typography" text="zoomed">
                                Zoomed: Z is really hard too. This doesn’t exactly mean “said” but you could probably use it to show someone
                                was speaking fast.
                            </CommonPopOver>
                        </div>{' '}
                    </Paragraph>
                </DialogBox>
            )}

            <br />
        </div>
    );
};

AToZOfSaid.propTypes = { type: PropTypes.string };

export default AToZOfSaid;
