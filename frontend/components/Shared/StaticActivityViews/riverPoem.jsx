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

const RiverPoem = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday good_and_bad shifting_sentences">
            <Heading1 centerText text="River Poem" />

            <Divider customClass="mt7 mb5" />

            <Paragraph>
                In this activity, you are going to be making a poem about a river. You need to write each line of your poem on a separate
                piece of paper so you can move them around and change the order.
            </Paragraph>

            <br />

            <Paragraph>
                <b>You will need:</b>
            </Paragraph>

            <ul>
                <li>8-10 slips of paper big enough to write two words on.</li>
                <li>Something to write with.</li>
            </ul>

            <Divider customClass="mt7 mb5" />

            <Heading1 customClass="sub_heading" centerText text="Planning" />

            <br />

            <ol>
                <li>
                    Talk about rivers. What are they like? Are they the same at the beginning and end? How does the water move? Do they make
                    any noises?
                </li>

                <li>
                    Think of a list of words ending -ing (verbs) which you could use to talk about a river, e.g. “flowing” or “burbling”.
                    8-10 words is a good number. Click the button below for some suggestions if you get stuck.
                </li>
            </ol>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="River -ing words" color="inherit" />
            </div>

            <ol>
                <li className="hidden_item" />
                <li className="hidden_item" />
                <li>
                    For each -ing{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="verb">
                            Verbs: these are also known as “doing words” because they tell you what something is doing.
                        </CommonPopOver>
                    </div>
                    , you will need a{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="noun">
                            Nouns: these are the names of something, e.g. cat or river.
                        </CommonPopOver>
                    </div>{' '}
                    (the name of something) to do with the river. It could just be the word “river” or “water”, it could be something in the
                    river, or it could be something else. You can choose! It doesn’t matter if you use the same noun more than once.
                </li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/river_poem.png`}
                    alt="river_poem"
                />
            </div>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Writing" />

            <br />

            <ol>
                <li>
                    Write a noun and verb pair on each slip of paper. An even number of pieces will probably work best. Maybe do five each
                    (so you have ten in total).
                </li>
                <li>Work together to put your pieces of paper in order to make a poem.</li>
                <li>Record that version (you could take a photo or write it down).</li>
                <li>Read it aloud.</li>
            </ol>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Editing" />

            <br />

            <ol>
                <li>
                    Now work together to try changing the order to make the poem more effective. This is called “editing”. Maybe you could
                    change it so the sounds get louder through the poem or the movements get faster. Maybe you can change it so that there
                    are pairs of lines that work well together. Maybe you can change it so it builds up to something at the end. You can try
                    out anything you like!
                </li>
                <li>When you have another version you are happy with, record that too.</li>
                <li>Read both versions aloud.</li>
                <li>Which do you prefer? Why? Do you both agree?</li>
                <li>
                    Looking at your favourite version, are there any words you could change to make it even better? Is there anything you
                    would like to add in? Or maybe something needs taking away?
                </li>
            </ol>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="River -ing words">
                    <Paragraph>
                        Bubbling, burbling, crashing, falling, flowing, gushing, meandering, running, rushing, swirling, swishing,
                        trickling, tumbling, washing.
                    </Paragraph>
                </DialogBox>
            )}
            <br />
        </div>
    );
};

RiverPoem.propTypes = { type: PropTypes.string };

export default RiverPoem;
