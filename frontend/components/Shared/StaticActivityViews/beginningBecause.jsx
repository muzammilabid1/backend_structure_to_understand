import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const BeginningBecause = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday beginning_because">
            <Heading1 centerText text="Beginning Because" />
            <Divider customClass="my5" />
            <Paragraph>
                If you are feeling really fancy, you can also use &quot;because&quot; at the start of the sentence, e.g. &quot;Because it is
                sunny, I will need to wear sunscreen.&quot;
                <br />
                <br />
                (This activity is based on a poem called ‘<u onClick={() => setOpen(true)}>For want of a Nail</u>
                ’.)
            </Paragraph>
            <Divider customClass="my10" />
            <Heading1 customClass="sub_heading" centerText text="Read" />
            <br />
            <br />

            <div
                className="buble_conainer"
                style={{
                    backgroundImage: `url(${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/horse_shoe.png)`
                }}>
                <Paragraph>
                    <u style={{ cursor: 'default' }}>Because of a Nail</u>
                </Paragraph>

                <Paragraph>Because of a nail, the shoe was lost.</Paragraph>

                <Paragraph>Because of a shoe, the horse was lost.</Paragraph>

                <Paragraph>Because of a horse, the rider was lost.</Paragraph>

                <Paragraph>Because of a rider, the battle was lost.</Paragraph>

                <Paragraph>Because of a battle, the kingdom was lost.</Paragraph>

                <Paragraph>And all because of a horseshoe nail.</Paragraph>
            </div>

            <Divider customClass="my10" />
            <Heading1 customClass="sub_heading" centerText text="Talk" />
            <br />
            <br />
            <ul>
                <li>What is the poem about?</li>
                <li>
                    <i>
                        Horseshoes are attached to the bottom of horses’ hooves using nails. In this poem, the horse’s shoe comes off
                        because it is missing a nail.
                    </i>
                </li>
                <li>What do you think happened in the rest of the poem?</li>
                <li>Does the poem have a message?</li>
            </ul>
            <Divider customClass="my10" />
            <Heading1 customClass="sub_heading" centerText text="Think" />
            <br />
            <br />
            <Paragraph>
                Can you think of a tiny thing that could have a big consequence? Maybe a shoe could be missing a shoelace. Or maybe a car
                tyre could be punctured by a nail. Maybe you have another idea!
            </Paragraph>
            <Divider customClass="my10" />
            <Heading1 customClass="sub_heading" centerText text="Write" />
            <br />
            <br />
            <Paragraph>
                Have a go at writing your own poem using your idea, using ‘because’ to start your sentences like in the poem at the top.
            </Paragraph>
            {open && (
                <DialogBox className="activity_modal" open={open} setOpen={() => setOpen(!open)} type={type} heading="For Want of a Nail">
                    <Paragraph>
                        This is the original poem. In the activity we have changed the words slightly to help think about using ‘because’ at
                        the start of a sentence.
                    </Paragraph>

                    <br />

                    <Paragraph>By Anon (this is short for ‘Anonymous’, which means we don’t know who wrote it)</Paragraph>

                    <br />

                    <Paragraph>
                        For want of a nail the shoe was lost.
                        <br />
                        For want of a shoe the horse was lost.
                        <br />
                        For want of a horse the rider was lost.
                        <br />
                        For want of a rider the battle was lost.
                        <br />
                        For want of a battle the kingdom was lost.
                        <br />
                        And all for the want of a horseshoe nail.
                        <br />
                    </Paragraph>
                </DialogBox>
            )}
            <br />
            <br />
        </div>
    );
};

BeginningBecause.propTypes = { type: PropTypes.string };

export default BeginningBecause;
