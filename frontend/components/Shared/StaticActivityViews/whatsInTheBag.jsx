/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import CommonTabs from '../CommonTabs';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const WhatsInTheBag = ({ type }) => {
    const [active, setActive] = useState(0);
    const [open, setOpen] = useState(false);

    return (
        <div className="happy_birthday whats_in_the_bag">
            <Heading1 centerText text="What’s in the Bag?" />

            <Divider customClass="my5" />

            <Paragraph>
                In this activity, you will take it in turns to choose objects or words from a bag and describe them to the other player. The
                challenge is to make your description really clear without saying what it is!
            </Paragraph>

            <CommonTabs className="tabs" tebs={['With Reading', 'Without Reading']} value={active} onChange={setActive}>
                {active === 0 ? (
                    <>
                        <b>For this game, you will need:</b>

                        <ul>
                            <li>
                                Slips of paper with words on. They need to be nouns (things). About 24 is a good number for two players. You
                                could even write 12 words each! Make sure both players can read all the words.
                            </li>
                            <li>A container to put the bits of paper in. It could be a colander, a hat, a bowl or something else!</li>
                            <li>A two minute timer. The timer on your phone will work well, or another timer like the one on the oven.</li>
                        </ul>

                        <br />

                        <b>How to play</b>

                        <ol>
                            <li>Fold each word card in half and put it into the container.</li>
                            <li>Choose who is going to describe first.</li>
                            <li>Start the two minute timer.</li>
                            <li>
                                The first player must describe as many words as they can to the other player before the time runs out. You
                                must not say the word or its spelling!
                            </li>
                            <li>
                                Each time they guess a word, you can keep the slip (so you can see how many you successfully described).
                            </li>
                            <li>When the time runs out, swap over.</li>
                            <li>Keep swapping over until all the words have run out.</li>
                            <li>Count up the number of words you successfully described. Who described the most? They are the winner!</li>
                        </ol>

                        <div className="img_container">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/WhatsintheBag.png`}
                                alt="What’s in the Bag?"
                            />
                        </div>
                        <br />
                    </>
                ) : (
                    <>
                        <b>Setting up the activity:</b>
                        <ul>
                            <li>
                                Find a bag. It should not be see-through and ideally should not rustle when it moves. A pillowcase would
                                also work well.
                            </li>
                            <li>
                                Each person should choose some small objects which will fit in the bag (click the button below to see some
                                object suggestions ). Don’t show the other person what you’ve collected!
                            </li>
                            <li>Put the objects in the bag.</li>
                        </ul>

                        <div className="btn_container">
                            <LWPButton onClick={() => setOpen(true)} btnText="Object suggestions" color="inherit" />
                        </div>

                        <Paragraph>
                            <b>How to play:</b>
                            <br />
                            Take it in turns to put your hand in the bag and choose an object. Feel it really carefully and describe it to
                            the other person. They must guess what it is. Think about what words you can use to help them guess (and what
                            words not to use to avoid giving it away too quickly).
                        </Paragraph>

                        <div className="img_container">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/WhatsintheBag1.png`}
                                alt="What’s in the Bag?"
                            />
                        </div>

                        {open && (
                            <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Object suggestions">
                                <ul>
                                    <li>Spoon</li>
                                    <li>Sock</li>
                                    <li>Plastic animal</li>
                                    <li>Duplo block</li>
                                    <li>Elastic band</li>
                                    <li>Lid</li>
                                    <li>Coin</li>
                                    <li>Apple</li>
                                    <li>Toothbrush</li>
                                    <li>Foil</li>
                                    <li>Uncooked pasta</li>
                                </ul>
                            </DialogBox>
                        )}

                        <br />
                    </>
                )}
            </CommonTabs>
        </div>
    );
};

WhatsInTheBag.propTypes = { type: PropTypes.string };

export default WhatsInTheBag;
