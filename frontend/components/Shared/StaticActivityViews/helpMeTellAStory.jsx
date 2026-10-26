/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import CommonPopOver from '../CommonPopOver';
import CommonTabs from '../CommonTabs';
import DiceComponent from '../Dice';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const HelpMeTellAStory = () => {
    const [active, setActive] = useState(0);
    const tebs = ['On Paper', 'Online'];

    return (
        <div className="happy_birthday improveIt help_me_Tell_a_Story ">
            <Heading1 centerText text="Help me Tell a Story" />
            <br />

            <Divider customClass=" mb5" />

            <Paragraph>
                <b>The aim of the game</b>
                <br />
                For one person to tell a story orally (using your voice rather than writing) and the other to help (and challenge) them by
                adding in ideas.
                <br />
                <br />
                Click the tabs below to see how to set up the game on paper or online.
            </Paragraph>

            <Divider customClass=" my5" />

            <Heading1 customClass="sub_heading" centerText text="Setting up the game" />
            <br />

            <div className="class_overview">
                <CommonTabs className="tabs" tebs={tebs} value={active} onChange={setActive}>
                    {active === 0 ? (
                        <>
                            <ol>
                                <b>
                                    <li>Find four containers.</li>
                                </b>
                            </ol>
                            <Paragraph>These can be bowls, tubs, hats, anything you like!</Paragraph>
                            <br />

                            <ol>
                                <li className="hidden_item" />
                                <b>
                                    <li>Label each container</li>
                                </b>
                            </ol>
                            <ul>
                                <li>Characters</li>
                                <li>
                                    {' '}
                                    <div className="pop_over">
                                        <CommonPopOver hover text="Settings" childrenClass="typography">
                                            Settings: places in a story
                                        </CommonPopOver>
                                    </div>{' '}
                                </li>
                                <li>Objects</li>
                                <li>Actions</li>
                            </ul>
                            <br />

                            <ol>
                                <li className="hidden_item" />
                                <li className="hidden_item" />
                                <b>
                                    <li>Print (or write) your word cards </li>
                                </b>
                            </ol>
                            <Paragraph>You will need at least ten words for each of these four categories:</Paragraph>

                            <ul>
                                <li>Characters</li>
                                <li>Settings</li>
                                <li>Objects</li>
                                <li>Actions</li>
                            </ul>
                            <br />

                            <Paragraph>You can write your own or print by clicking the button below.</Paragraph>
                            <div className="btn_container">
                                <DownloadPDFBtn color="primary" url="/assets/pdf-files/HelpMeTellAStoryCards.pdf" btnText="Word cards" />
                            </div>

                            <ol>
                                <li className="hidden_item" />
                                <li className="hidden_item" />
                                <li className="hidden_item" />
                                <b>
                                    <li>Sort your word cards </li>
                                </b>
                            </ol>
                            <Paragraph>Put your word cards into the four containers.</Paragraph>
                        </>
                    ) : active === 1 ? (
                        <>
                            <Paragraph>These dice show words from four categories:</Paragraph>
                            <ol>
                                <li>Characters </li>
                                <li>
                                    {' '}
                                    <div className="pop_over">
                                        <CommonPopOver hover text="Settings" childrenClass="typography">
                                            Settings: places in a story
                                        </CommonPopOver>
                                    </div>{' '}
                                </li>
                                <li>Objects</li>
                                <li>Actions</li>
                            </ol>
                            <br />
                            <Paragraph>
                                When you play the game, you will need to pick one of the categories and roll that die to choose a word.
                            </Paragraph>

                            <br />
                            <DiceComponent
                                btnText="Pick a character"
                                inputArray={[sharedJson?.characters]}
                                staticWidth="236px"
                                height="116px"
                            />
                            <br />
                            <DiceComponent
                                btnText="Pick a setting"
                                inputArray={[sharedJson?.settings]}
                                staticWidth="236px"
                                height="116px"
                            />
                            <br />
                            <DiceComponent btnText="Pick an object" inputArray={[sharedJson?.objects]} staticWidth="236px" height="116px" />
                            <br />
                            <DiceComponent btnText="Pick an action" inputArray={[sharedJson?.actions]} staticWidth="236px" height="116px" />
                        </>
                    ) : (
                        ''
                    )}
                </CommonTabs>
            </div>
            <Divider customClass=" my5" />

            <Heading1 customClass="sub_heading" centerText text="How to play" />
            <br />

            <ol>
                <li>Choose who will be the Storyteller and who will be the Helper.</li>
                <li>The Helper picks a word from one of the containers.</li>
                <li>The Storyteller uses this word to begin telling the story.</li>
                <li>The Helper gives them another word.</li>
                <li>The Storyteller keeps telling the story and includes this new word.</li>
                <li>Every time the Helper adds a new word, the Storyteller must include it in the story.</li>
                <li>Keep going until you get to the end of the story!</li>
            </ol>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group12.png`}
                    alt="this place"
                />
            </div>
            <br />

            <Paragraph>
                <b>Tips:</b>
            </Paragraph>
            <br />

            <ul>
                <li>
                    The Helper should think about which tub to choose from – what part of the story does the Storyteller need help with?
                </li>
                <li>
                    If you are telling the story, decide who your main character is as soon as possible and stick with them! Think about
                    story structure too – give them a problem and use the story to help solve the problem. If you keep these two things in
                    mind, your story will work!
                </li>
                <li>
                    It is fun for the Helper to make it tricky for the Storyteller, but it’s also your job to keep the story going, so
                    listen carefully to the story and add things which will help it keep moving!
                </li>
            </ul>
        </div>
    );
};

export default HelpMeTellAStory;
