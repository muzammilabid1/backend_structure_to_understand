/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import { Card } from '@mui/material';
import { Grid } from '@mui/material';
import gql from 'graphql-tag';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS, TEACHER } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { getTopicType, ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import Divider from '../Divider';
import DownloadPDFBtn from '../DownloadPDFBtn';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

// Queries

const getPupilActivityForSoundsScavengerHunt = gql`
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

const updateActivityContextForSoundsScavengerHunt = gql`
    mutation updateActivityContext($pupilActivityId: String!, $pupilActivityContext: String!) {
        updateActivityContext(pupilActivityId: $pupilActivityId, pupilActivityContext: $pupilActivityContext) {
            id
        }
    }
`;

const SoundsScavengerHunt = ({ type, context, readOnly }) => {
    const queryParams = useParams();
    const [checkList, setCheckList] = useState([]);
    const { callSnackbar, token } = useContext(ThemeContext);

    const [updateActivityContextMutation, { error: error }] = useMutation(updateActivityContextForSoundsScavengerHunt, {
        refetchQueries: [{ query: getPupilActivityForSoundsScavengerHunt, variables: { id: queryParams?.activity_id } }],
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

        updateActivityContextMutation({
            variables: { pupilActivityId: queryParams?.activity_id, pupilActivityContext: getBoolArray }
        });
    };

    const setIsChecked = () => {
        let newArr = [];

        if (context) {
            newArr = sharedJson?.digital_checklist.map((item, index) => {
                item.checked = JSON.parse(context)[index] ? true : false;

                return item;
            });
        } else {
            return sharedJson?.digital_checklist;
        }

        return newArr;
    };

    useEffect(() => {
        setCheckList(setIsChecked());
    }, []);

    return (
        <div className="happy_birthday sounds_cavenger_hunt">
            <Heading1 centerText text="Sounds Scavenger Hunt" />
            <Divider customClass="my5" />
            <Paragraph>
                <b>You will need:</b>
            </Paragraph>
            <ul>
                <li>
                    Scavenger hunt sheet (click the button below to download a printable version. If you can’t print, you could use digital
                    the checklist below)
                </li>
                <li>Something to write with</li>
            </ul>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="The activity" />

            <br />
            <br />

            <Paragraph>
                Take the scavenger hunt sheet and a pen or pencil, or the digital version below, outside with you. You could go in your
                garden, to a park, or on a walk. See which of the sounds you can hear and tick them off when you find them. You might need
                to stand really still and quiet to hear some of them!
            </Paragraph>

            <Divider customClass="my10" />

            <Heading1 customClass="sub_heading" centerText text="Digital Checklist" />
            <br />
            <br />

            <Grid container spacing="4">
                {(checkList || []).map((item, index) => {
                    return (
                        <Grid key={item.key} xs={12} sm={6} md={6} lg={4} item>
                            <Card className={`check_box_card top-${getTopicType(type)}-border`}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item.image}`}
                                    alt="check box"
                                />

                                <div className="check_box_container">
                                    <CommonCheckBox
                                        checked={item.checked}
                                        labelPlacement="start"
                                        label={item.caption}
                                        onClick={() =>
                                            readOnly || token?.userType === TEACHER ? () => {} : _onClick(index, !item.checked)
                                        }
                                    />
                                </div>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
            <br />

            <DownloadPDFBtn url="/assets/pdf-files/SoundsScavengerHunt.pdf" />

            <Divider customClass="my10" />
            <Heading1 customClass="sub_heading" centerText text="Back Home" />

            <br />
            <br />

            <Paragraph>
                When you get home, here are some things you could think about:
                <ul>
                    <li>Which sounds were easier and more difficult to find. Why were some harder than others?</li>
                    <li>Which was your favourite sound? Why?</li>
                    <li>Were there any sounds you didn’t like? Why?</li>
                </ul>
            </Paragraph>
            <br />
        </div>
    );
};

SoundsScavengerHunt.propTypes = { readOnly: PropTypes.bool, type: PropTypes.string, context: PropTypes.string };

export default SoundsScavengerHunt;
