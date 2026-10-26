/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import CommonPopOver from '../CommonPopOver';
import DiceComponent from '../Dice';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const ImagineYouAreThere = () => {
    return (
        <div className="imagine_you_are_there">
            <Heading1 centerText text="Imagine you are there!" />

            <Divider customClass="my5" />

            <Paragraph>
                <b>The activity:</b>
                <br />
                Shut your eyes and describe a{' '}
                <div className="pop_over">
                    <CommonPopOver childrenClass="typography" hover text="setting">
                        Setting: a place, often used to describe the place where a story happens.
                    </CommonPopOver>
                </div>{' '}
                in your imagination. You both have to imagine you are there, and you can add details as you &quot;spot&quot; them.
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/imagineyouarethere.png`}
                    alt="this place"
                />
            </div>

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Challenge" />

            <br />

            <Paragraph>
                Can you change the{' '}
                <div className="pop_over">
                    <CommonPopOver childrenClass="typography" hover text="mood">
                        Mood: the predominant (main) feeling or emotion. When we talk about the mood of a piece of writing, we are thinking
                        about the main feeling it would give the person reading it.
                    </CommonPopOver>
                </div>{' '}
                in your setting? Choose a mood using the die below and then describe how it changes.
            </Paragraph>

            <DiceComponent btnText="Roll new mood" inputArray={[sharedJson?.imagine_you_are_there]} isWidthFixed isHeightFixed />

            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Writing Challenge" />

            <br />

            <Paragraph>Roll the mood die again and see if you can write a paragraph describing your setting using this new mood.</Paragraph>
            <br />
        </div>
    );
};

export default ImagineYouAreThere;
