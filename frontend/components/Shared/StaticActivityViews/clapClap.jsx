/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const ClapClap = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="clap_clap">
            <Heading1 centerText text="Clap! Clap! Clap!" />

            <Divider customClass="my5" />

            <Paragraph>
                Clap a pattern for the other person to copy <br />
                <br />
                Start with some simple patterns (e.g. clap, clap, clap) where there isn’t too much to think about, and then move onto some
                more complicated patterns.
            </Paragraph>

            <br />

            <Paragraph>Things to think about:</Paragraph>
            <ul className="mt0">
                <li>How many claps you do;</li>
                <li>How fast or slow the claps are;</li>
                <li>The spaces between the claps;</li>
                <li>The rhythm you use;</li>
                <li>How loud or quiet the claps are;</li>
                <li>Whether the pattern is the same all the way through or changes.</li>
            </ul>

            <div className="img_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/clap_clap.png`} alt="animals" />
            </div>

            <Divider customClass="mid_divider" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />

            <br />

            <Paragraph>
                You could try the same activity using a shaker or a musical instrument! You could even make your own shaker by putting small
                objects inside a box or bottle.
            </Paragraph>

            <div className="btn_container">
                <LWPButton btnText="Instructions for making a shaker" onClick={() => setOpen(true)} color="inherit" />
            </div>

            {open && (
                <DialogBox
                    className="clap_clap_modal"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading="How to make a shaker">
                    <ol>
                        <li>Find a small bottle or box.</li>
                        <li>
                            If you are using a box, make sure one end is taped closed so nothing can escape while you are putting things in
                            the top.
                        </li>
                        <li>
                            Put some things inside your container that will make a sound when you shake it (you could use beads, beans,
                            small stones, lentils, or anything you like).
                        </li>
                        <li>
                            Shut the top of your container. If it’s a bottle, screw the lid on tightly. If it’s a box, you might need to
                            tape the top shut.
                        </li>
                        <li>Give it a shake and see what sound it makes!</li>
                    </ol>

                    <div className="img_container">
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/bottle.png`}
                            alt="animals"
                        />
                    </div>
                </DialogBox>
            )}
        </div>
    );
};

ClapClap.propTypes = { readOnly: PropTypes.bool, type: PropTypes.string };

export default ClapClap;
