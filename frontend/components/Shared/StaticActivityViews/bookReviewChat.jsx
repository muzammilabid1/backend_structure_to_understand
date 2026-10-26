/* eslint-disable @next/next/no-img-element */
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

const BookReviewChat = () => {
    return (
        <div className="happy_birthday book_review_chat">
            <Heading1 centerText text="Book Review Chat" />

            <Divider customClass="my5" />

            <Paragraph>
                Discuss together a book you have recently read. It can be any book; one your child can read by themself or one that has been
                read to them. Both of you should share your opinions!
            </Paragraph>

            <br />

            <Paragraph>
                Have a look at the questions below to help you with your book review chat! Remember, there are no right or wrong answers.
                You might need to look back through the book while you are talking to help you answer the questions. Remember, both people
                should join in the discussion. You might not always agree with each other!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/storytelling.png`}
                    alt="Book Review Chat"
                />
            </div>

            <Divider customClass="my5" />

            <Accordion defaultExpanded className={'bg_trnsparent'}>
                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                    <div className={'classes.column'}>
                        <Paragraph>General ideas:</Paragraph>
                    </div>
                </AccordionSummary>

                <AccordionDetails className="secondary-accordion-details">
                    <ul>
                        <li>What did you like?</li>
                        <li>What do you think could be improved?</li>
                        <li>Did you think the book was any good? Why?</li>
                        <li>Which part of the book did you like best?</li>
                    </ul>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                    <div className={'classes.column'}>
                        <Paragraph>
                            About details of the{' '}
                            <div className="pop_over">
                                <CommonPopOver hover childrenClass="typography" text="language">
                                    Language: the words chosen by an author or poet.
                                </CommonPopOver>
                            </div>{' '}
                            (words) used in the book:
                        </Paragraph>
                    </div>
                </AccordionSummary>

                <AccordionDetails className="secondary-accordion-details">
                    <ul>
                        <li>Which words or phrases did you find particularly interesting? Why?</li>
                        <li>Which words or phrases really helped you to imagine something? How?</li>
                    </ul>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                    <div className={'classes.column'}>
                        <Paragraph>About the characters:</Paragraph>
                    </div>
                </AccordionSummary>

                <AccordionDetails className="secondary-accordion-details">
                    <ul>
                        <li>
                            Who was your favourite{' '}
                            <div className="pop_over">
                                <CommonPopOver hover childrenClass="typography" text="character">
                                    Character: A person (or person-like thing, e.g. an animal or an alien) in a book.
                                </CommonPopOver>
                            </div>{' '}
                            ? Why?
                        </li>
                        <li>
                            Choose a moment in the story you particularly enjoyed. How was the character feeling then? What clues were there
                            in the writing that helped you know?
                        </li>
                        <li>Were there any characters you wish you knew more about?</li>
                        <li>Did any of the characters in the book do anything that surprised you at all?</li>
                    </ul>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                    <div className={'classes.column'}>
                        <Paragraph>Comparing to other books:</Paragraph>
                    </div>
                </AccordionSummary>

                <AccordionDetails className="secondary-accordion-details">
                    <ul>
                        <li>Was it like any other books you have read? In what ways?</li>
                        <li>Which other story has a main character most like this book? How are they similar? How are they different?</li>
                        <li>Which other story has a problem most like this book (it might be a different book)?</li>
                        <li>
                            What{' '}
                            <div className="pop_over">
                                <CommonPopOver hover childrenClass="typography" text="themes">
                                    Themes: ideas that recur in a story or poem, e.g. love or mystery.
                                </CommonPopOver>
                            </div>{' '}
                            did you spot in the book? Do you know any other books with similar themes?
                        </li>
                    </ul>
                </AccordionDetails>
            </Accordion>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore className="expand-icon" />}>
                    <div className={'classes.column'}>
                        <Paragraph>Overall review:</Paragraph>
                    </div>
                </AccordionSummary>

                <AccordionDetails className="secondary-accordion-details">
                    <ul className="unordered_list">
                        <li>Would you read this book again? Why?</li>
                        <li>Would you want to read any other books by the same author or illustrator?</li>
                        <li>Why?</li>
                        <li>How many stars would you give it out of five? Why?</li>
                        <li>
                            Who would you{' '}
                            <div className="pop_over">
                                <CommonPopOver hover childrenClass="typography" text="recommend">
                                    Recommend: when you recommend something, you suggest to someone that they might enjoy it or find it good
                                    or useful.
                                </CommonPopOver>
                            </div>{' '}
                            this book to? Why?
                        </li>
                    </ul>
                </AccordionDetails>
            </Accordion>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Extra Challenge" />

            <br />

            <Paragraph>
                Why not write a letter to someone you think would enjoy reading this book and explain why they would like it?
            </Paragraph>

            <br />
        </div>
    );
};

export default BookReviewChat;
