/* eslint-disable @next/next/no-img-element */
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import LWPButton from '../Button/LWPButton';
import CommonTabs from '../CommonTabs';
import DiceComponent from '../Dice';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const AlphabeticalCategories = ({ type }) => {
    const [active, setActive] = useState(0);
    const [open, setOpen] = useState(false);

    return (
        <div className="alphabetical_categories">
            <Heading1 centerText text="Alphabetical Categories" />

            <Divider customClass="my5" />

            <Paragraph>
                This game involves writing a list in alphabetical order. If you want to find out more about alphabetical order, click the
                button below.
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Alphabetical order" color="inherit" />
            </div>

            <CommonTabs className="tabs" tebs={['Work Together', 'Be Competitive']} value={active} onChange={setActive}>
                {active === 0 ? (
                    <>
                        <Paragraph>
                            When you’re working together, make sure both people share their ideas and listen to what the other person has to
                            say.
                        </Paragraph>
                        <br />

                        <b>How to play:</b>

                        <ol>
                            <li>Pick a category, e.g. fruits and vegetables, or roll the die below for a category suggestion.</li>
                            <li>Start the timer. It should run for 2 minutes!</li>
                            <li>Work together to write a list of things in the category.</li>
                            <li>When the timer stops, count up your score.</li>
                        </ol>

                        <br />

                        <DiceComponent
                            btnText="Roll new category"
                            inputArray={[sharedJson?.alphabetical_categories]}
                            isHeightFixed
                            isWidthFixed
                        />

                        <br />

                        <b>Rules:</b>

                        <ul>
                            <li>The things in your list must be in alphabetical order.</li>
                            <li>
                                You can’t add anything into the middle of your list, only onto the end (so if you think of something that
                                would go earlier in your list, you can’t add it in).
                            </li>
                            <li>You get one point for each thing in your list.</li>
                            <li>If you have something in the wrong place, you don’t get any points for that thing.</li>
                        </ul>

                        <div className="img_container">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/alphabetical_categories.png`}
                                alt="alphabetical categories"
                            />
                        </div>

                        <br />

                        <Paragraph>
                            <b>Too tricky?</b>
                            <br />
                            Try writing three words from your category on little bits of paper and moving them around to put them in order.
                            Start with words that begin with different letters, and then try some that start with the same letter.
                        </Paragraph>
                    </>
                ) : (
                    <>
                        <Paragraph>For this activity, you will need a timer. The one on a phone will be fine.</Paragraph>
                        <br />

                        <b>How to play:</b>

                        <ol>
                            <li>Pick a category, e.g. fruits and vegetables, or roll the die below for a category suggestion.</li>
                            <li>Start the timer. It should run for 1 minute!</li>
                            <li>Both players write their own list of things in the category.</li>
                            <li>When the timer stops, count up your score.</li>
                        </ol>

                        <br />

                        <DiceComponent
                            btnText="Roll new category"
                            inputArray={[sharedJson?.alphabetical_categories]}
                            isHeightFixed
                            isWidthFixed
                        />

                        <br />

                        <b>Rules:</b>

                        <ul>
                            <li>The things in your list must be in alphabetical order.</li>
                            <li>
                                You can’t add anything into the middle of your list, only onto the end (so if you think of something that
                                would go earlier in your list, you can’t add it in).
                            </li>
                            <li>You get one point for each thing in your list.</li>
                            <li>If you have something in the wrong place, you don’t get any points for that thing.</li>
                        </ul>

                        <div className="img_container">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/alphabetical_categories.png`}
                                alt="alphabetical categories"
                            />
                        </div>

                        <br />

                        <Paragraph>
                            <b>Need an extra challenge?</b>
                            <br />
                            Instead of choosing a category, pick a starting letter that all your words must begin with.
                        </Paragraph>
                    </>
                )}
                {open && (
                    <DialogBox
                        className="alphabetical_categories_dialog"
                        open={open}
                        setOpen={() => setOpen(!open)}
                        type={type}
                        heading="Alphabetical order">
                        <Paragraph>
                            When you put words in alphabetical order, you look at the letters at the beginning of the words and use them to
                            put the words in order. Here is an example:
                        </Paragraph>

                        <br />

                        <span className="big_alphabets">apple, carrot, pear</span>

                        <br />
                        <br />

                        <Paragraph>
                            The letter ‘a’ comes before ‘c’ and ‘p’ in the alphabet, so ‘apple’ comes first. Letter ‘c’ is before ‘p’ so
                            ‘carrot’ is next and ‘pear’ is last.
                        </Paragraph>

                        <br />

                        <Paragraph>
                            Sometimes, words you want to put in order start with the same letter. Then you need to look at the next letters
                            in the words. Here is an example:
                        </Paragraph>

                        <br />

                        <span className="big_alphabets">Hannah, Hema, Henry</span>

                        <br />
                        <br />

                        <Paragraph>
                            All three names begin with ‘H’, so then we look at the second letters. ‘Hannah’ has ‘a’ second and the other two
                            names have ‘e’ second. Because ‘a’ comes before ‘e’, ‘Hannah’ is the first name in the list. The other two names
                            have the same second letter, so we look at the third letter: ‘m’ is before ‘n’ in the alphabet, so ‘Hema’ comes
                            before ‘Henry’.
                        </Paragraph>
                    </DialogBox>
                )}
            </CommonTabs>
            <br />
        </div>
    );
};

AlphabeticalCategories.propTypes = { type: PropTypes.string };

export default AlphabeticalCategories;
