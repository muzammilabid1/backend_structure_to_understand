/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import gql from 'graphql-tag';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';
import DialogBox from './dialog';

// Queries

const getPupilActivityForFindAWord = gql`
    query getPupilActivity($id: String!) {
        getPupilActivity(id: $id) {
            id
            rating
            mathscotActivityItemIds
            context
            pupil {
                id
                fullname
                firstname
                lastname
                school {
                    curentPeriod {
                        index
                    }
                }
                currentMathscot {
                    character
                    colour
                }
            }
            topic {
                id
                period {
                    index
                }
            }
            feedbacks {
                id
                pupilComment
                parentComment
                userName
                userId
                logCreatedAt
                logCreatedBy {
                    id
                    firstname
                    lastname
                }
                photos {
                    id
                    filename
                }
                sharingAllowed
            }
            activity {
                id
                name
                starValue
                activityType
                welcomeMessage
                topic {
                    id
                    teacherTopicName
                    parentTopicName
                }
                details
                steps {
                    ... on StaticLwpActivityLegacy {
                        legacySteps {
                            id
                            order
                            stepType
                            text
                            imageUrl
                            downloadUrl
                            downloadName
                            linkUrl
                            linkName
                            properties
                            fontType
                            fontSize
                            textCarouselData
                            carouselData {
                                textEditorState
                                labelEditorState
                                type
                                imageUrl
                                alt
                                fileName
                                fileIdentifier
                            }
                            accordionData
                            checkListTextData
                            tableData
                            selectedModalId
                            fileName
                            editorState
                            timerData
                            btnType
                            imageCarouselData
                            checklistImageData
                            includeSeconds
                            clickableAlphabetData
                            dimensions
                            audioUrl
                            tabsData
                            editAsHtml
                        }
                    }
                }
            }
        }
    }
`;

// Mutations

const updateActivityContextForFindAWord = gql`
    mutation updateActivityContext($pupilActivityId: String!, $pupilActivityContext: String!) {
        updateActivityContext(pupilActivityId: $pupilActivityId, pupilActivityContext: $pupilActivityContext) {
            id
        }
    }
`;

const FindAWord = ({ type, context, readOnly, isAdminView }) => {
    const [open, setOpen] = useState(false);

    const queryParams = useParams();
    const [checkList, setCheckList] = useState([]);
    const { callSnackbar, token } = useContext(ThemeContext);

    const [updateActivityContextMutation, { error: error }] = useMutation(updateActivityContextForFindAWord, {
        refetchQueries: [{ query: getPupilActivityForFindAWord, variables: { id: queryParams?.activity_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _onClick = (index, bool) => {
        let newCheckList = [...checkList];

        newCheckList[index].checked = bool;
        setCheckList(newCheckList);

        let getBoolArray = checkList.map((i) => i.checked);

        getBoolArray = JSON.stringify(getBoolArray);

        if (token?.userType === 'TEACHER' || isAdminView) return;

        updateActivityContextMutation({
            variables: { pupilActivityId: queryParams?.activity_id, pupilActivityContext: getBoolArray }
        });
    };

    const setIsChecked = () => {
        let newArr = [];

        if (context) {
            newArr = sharedJson?.dictionary_checkbox.map((item, index) => {
                item.checked = JSON.parse(context)[index] ? true : false;

                return item;
            });
        } else {
            return sharedJson?.dictionary_checkbox;
        }

        return newArr;
    };

    useEffect(() => {
        setCheckList(setIsChecked());
    }, []);

    return (
        <div className="happy_birthday improveIt FindAWord">
            <Heading1 centerText text="Find A Word" />

            <Divider customClass="mt5 mb7" />

            <Paragraph>
                <b>For this activity you will need:</b>
            </Paragraph>
            <ul>
                <li>A dictionary or a book with an index, e.g. a recipe book.</li>
                <li>A pencil and paper.</li>
            </ul>
            <Divider customClass="my5" />

            <Heading1 customClass="sub_heading" centerText text="Warmup: Find a Word" />

            <br />
            <br />
            <ol>
                <li>Player 1 chooses a word from the dictionary/index</li>
                <li>Player 2 must find the word as fast as they can.</li>
                <li>Swap over so Player 2 chooses a new word and Player 1 tries to find it.</li>
                <li>Repeat three or four times each. Which words were hardest to find?</li>
            </ol>
            <br />

            <Paragraph>
                <b>Tip:</b> Think about how to choose a word that is tricky to find. Maybe it’s the word’s position in the alphabet, or
                maybe it is spelled in a surprising way!
            </Paragraph>

            <div className="img_container">
                <img
                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mask_Group2.png`}
                    alt="minister cat"
                />
            </div>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Activity: Spell a Word" />

            <br />
            <br />

            <ol>
                <li>
                    Player 1 finds a word in the dictionary/index and writes it down without showing the other person (try to choose one
                    which is hard to spell).
                </li>
                <li>Player 1 tells Player 2 the word but not the spelling.</li>
                <li>Player 2 writes down three ways they think the word could be spelled. Rank the words from most to least likely.</li>
                <li>Find the word in the dictionary/index and see how many points Player 2 gets:</li>
            </ol>
            <ul>
                <li>3 points if it is spelled the same as the one they ranked most likely</li>
                <li>2 points if it is spelled the same as their middle one</li>
                <li>1 point if it is spelled the same as the one they ranked least likely</li>
                <li>0 points if it is spelled differently from all their suggestions</li>
            </ul>
            <ol start="5">
                <li>Swap over.</li>
                <li>The first player with 10 points wins!</li>
            </ol>

            <Divider customClass="mt5 mb7" />

            <Heading1 customClass="sub_heading" centerText text="Extra Challenge" />

            <br />

            <Paragraph>
                If you have a dictionary,click the button below for a ‘Dictionary Scavenger Hunt’ and use the checklist to track your
                progress.
            </Paragraph>

            <div className="btn_container">
                <LWPButton onClick={() => setOpen(true)} btnText="Dictionary Scavenger Hunt" />
            </div>

            {open && (
                <DialogBox
                    className="find_a_word_dialog"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading="Dictionary Scavenger Hunt">
                    <Paragraph>In your dictionary, find a word that:</Paragraph>
                    <br />
                    {(sharedJson?.dictionary_checkbox || []).map((item, index) => (
                        <div id={item.id}>
                            <CommonCheckBox
                                className="dictionaryCheckbox"
                                style={{ pointerEvents: readOnly ? 'none' : '' }}
                                checked={item.checked}
                                label={item.caption}
                                onClick={() => _onClick(index, !item.checked)}
                            />
                        </div>
                    ))}
                </DialogBox>
            )}
        </div>
    );
};

FindAWord.propTypes = { type: PropTypes.string, context: PropTypes.string, readOnly: PropTypes.bool, isAdminView: PropTypes.bool };

FindAWord.defaultProps = {
    isAdminView: false
};

export default FindAWord;
