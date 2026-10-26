/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import LWPButton from '../Button/LWPButton';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

const GuessTheAnimal = ({ type }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="guess_the_animal">
            <Heading1 centerText text="Guess the Animal" />

            <Divider customClass="my5" />

            <Paragraph>
                Take it in turns to make an animal noise for the other person to guess. <br />
                <br />
                If you have some toy animals, you could put a selection in a bag. Take it in turns to choose an animal and show it to the
                other person when they have guessed correctly!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/guess_the_animal.png`}
                    alt="animals"
                />
            </div>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />
            <br />

            <Paragraph>
                Use your animal noise skills to sing Old MacDonald. Make sure you both join in with the animal noises! You could also try
                singing it in another language!
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="See the words" color="inherit" />
            </div>

            <Paragraph>You can also see a video of the song using the buttons below.</Paragraph>

            <div className="btn_group guessTheAnimalBtnGroup">
                <Link passHref href={'https://www.bbc.co.uk/tiny-happy-people/old-macdonald/zkhq7nb'}>
                    <LWPButton endIcon="open_in_new" color="inherit">
                        <a href="https://www.bbc.co.uk/tiny-happy-people/old-macdonald/zkhq7nb" target="_blank" rel="noreferrer">
                            English (BBC)
                        </a>
                    </LWPButton>
                </Link>
                <Link passHref href={'https://www.bbc.co.uk/tiny-happy-people/yoruba-nursery-rhyme-old-macdonald/zr6n6g8'}>
                    <LWPButton endIcon="open_in_new" color="inherit">
                        <a
                            href="https://www.bbc.co.uk/tiny-happy-people/yoruba-nursery-rhyme-old-macdonald/zr6n6g8"
                            target="_blank"
                            rel="noreferrer">
                            Yorùbá (BBC)
                        </a>
                    </LWPButton>
                </Link>
            </div>

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading="Old MacDonald Lyrics">
                    <Paragraph>
                        Old MacDonald had a farm
                        <br />
                        E-I-E-I-O
                        <br />
                        And on that farm he had a <span className="_span">cow</span>
                        <br />
                        E-I-E-I-O
                        <br />
                        With a <span className="_span">moo moo</span> here <br />
                        And a <span className="_span">moo moo</span> there
                        <br />
                        Here a <span className="_span">moo</span>, there a moo, <br />
                        Everywhere a <span className="_span">moo moo</span>
                        <br />
                        Old MacDonald had a farm
                        <br />
                        E-I-E-I-O!
                        <br />
                        <br />
                        Sing this lots of times, but each time you sing, change the animal name and the noise it makes!
                    </Paragraph>
                </DialogBox>
            )}
        </div>
    );
};

GuessTheAnimal.propTypes = { readOnly: PropTypes.bool, type: PropTypes.string };

export default GuessTheAnimal;
