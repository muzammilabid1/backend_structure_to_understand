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

const AnimalVegetableMineral = ({ type }) => {
    const [open, setOpen] = useState(false);
    const [exampleOrQuestion, setExampleOrQuestion] = useState('');

    const toggle = (modelType) => {
        setOpen(true);
        setExampleOrQuestion(modelType);
    };

    return (
        <div className="happy_birthday animal_vegetable_mineral">
            <Heading1 customClass="_heading" centerText text="Animal/Vegetable/Mineral" />

            <Divider customClass="my5" />

            <Paragraph>
                In this game, there are three categories: animal, vegetable and mineral. All objects fit into one of these categories (find
                examples of things in each category by clicking the button below).
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('examples')} btnText="Examples" />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />

            <br />
            <br />

            <ol>
                <li>Player 1 thinks of an object and tells the other player if it is an animal, a vegetable or a mineral.</li>
                <li>
                    Player 2 asks them{' '}
                    <div className="pop_over">
                        <CommonPopOver hover childrenClass="typography" text="questions">
                            Question: A question sentence is used to ask something, usually to find out information. It ends with a question
                            mark. Common words used to start questions include who, what, where, when, how and why.
                        </CommonPopOver>
                    </div>{' '}
                    to work out what the object is. They can only ask 20 questions and all questions must be answered with “yes” or “no”.
                </li>
                <li>If Player 2 guesses before they have asked 20 questions, they win. If they don’t guess, Player 1 wins.</li>
                <li>Swap over so the other person has a chance to ask the questions.</li>
            </ol>

            <br />

            <Paragraph>View some question starters for you to use by clicking the button below.</Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => toggle('question')} btnText="Question starters" />
            </div>

            <br />

            <div className="animals_imgs_container">
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/animal_1.png`} alt="animal 1" />
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/animal_2.png`} alt="animal 2" />
                <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/animal_3.png`} alt="animal 3" />
            </div>

            {open && (
                <DialogBox
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading={exampleOrQuestion === 'examples' ? 'Animal, Vegetable and Mineral examples' : 'Question Starter Prompts'}>
                    {exampleOrQuestion === 'examples' ? (
                        <>
                            <Paragraph>
                                <b>Animal:</b>
                                <br />
                                Any living creature, from an ant to the Queen. It can be a specific person if you like. It could also be
                                something made from a living creature, e.g. a leather handbag or a steak.
                            </Paragraph>
                            <br />
                            <Paragraph>
                                <b>Vegetable:</b>
                                <br />
                                Any plant or thing created from a plant. It could be a type of plant, e.g. a daisy or pond weed. It could be
                                something made from a plant, e.g. a wooden chair or cornflakes.
                            </Paragraph>
                            <br />
                            <Paragraph>
                                <b>Mineral:</b>
                                <br />
                                The easiest way to think about it is things which are not in the animal or vegetable categories. It could be
                                an actual mineral, e.g. gold. It could also be something made out of minerals, e.g. a brick or a car.
                            </Paragraph>
                        </>
                    ) : (
                        <Paragraph>
                            Is it…
                            <br />
                            Does it…
                            <br />
                            Can it…
                            <br />
                            Have you…
                            <br />
                            Will it…
                            <br />
                            Has it…
                            <br />
                            Do you…
                        </Paragraph>
                    )}
                </DialogBox>
            )}
            <br />
        </div>
    );
};

AnimalVegetableMineral.propTypes = { type: PropTypes.string };

export default AnimalVegetableMineral;
