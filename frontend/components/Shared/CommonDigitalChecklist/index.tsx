/* eslint-disable @next/next/no-img-element */
import { useMutation } from '@apollo/client';
import { Card, Grid } from '@mui/material';
import gql from 'graphql-tag';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { TEACHER } from '../../../shared/Constant';
import { getTopicType, ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

// Queries

const getPupilActivityForCommonDigitalChecklist = gql`
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

/**
 * A tickable checklist step, in either of the two flavours an activity can use:
 *
 *   contentType="image" (DIGITAL_CHECKLIST)           picture cards in a responsive grid
 *   contentType="text"  (TEXT_ONLY_DIGITAL_CHECKLIST) a headed, sequential list of lines
 *
 * The query, the save and the restore are shared. Only the item source, the persisted shape and the
 * markup differ.
 *
 * IMPORTANT: the two flavours write a pupil's ticks into `lwp_pupil_activity.context` in DIFFERENT
 * shapes, keyed by this step's id:
 *
 *   image -> [false, true, false]      bare booleans, matched back by POSITION in the list
 *   text  -> [{ key, checked }, ...]   matched back by the item's own key, so order can change
 *
 * Both shapes are already stored against real pupils. Unifying them would silently discard every tick
 * made on whichever flavour lost, so they are kept apart deliberately. `digital-checklist.spec.ts`
 * pins both shapes down.
 */
/**
 * One row of either flavour. The fields are all optional because the same state array holds image
 * items (imageUrl + caption, identified by position) and text items (listItem, identified by key),
 * and only the branch matching `contentType` ever reads its own pair.
 */
interface ChecklistItem {
    checked?: boolean;
    /** Image flavour. */
    imageUrl?: string;
    caption?: string;
    /** Text flavour. */
    key?: string;
    listItem?: string;
}

interface CheckListTextData {
    heading?: string;
    description?: string;
    checkList?: ChecklistItem[];
}

interface CommonDigitalChecklistProps {
    contentType: 'image' | 'text';
    /** Required when contentType is "image". */
    checklistImageData?: ChecklistItem[];
    /** Required when contentType is "text". */
    checkListTextData?: CheckListTextData;
    /** The pupil's saved ticks for the whole activity, as a JSON string keyed by step id. */
    pupilActivityContext?: string;
    /** The topic's isReading flag, used for the image cards' border colour. */
    subject?: boolean;
    readOnly?: boolean;
    digitalChecklistId?: string;
}

/** What one step's ticks look like once serialised. See the note above the component. */
type StoredTicks = boolean[] | { key?: string; checked?: boolean }[];

const CommonDigitalChecklist = ({
    contentType,
    checklistImageData,
    checkListTextData,
    pupilActivityContext,
    subject,
    readOnly,
    digitalChecklistId
}: CommonDigitalChecklistProps) => {
    const isText = contentType === 'text';
    const queryParams = useParams();
    const { callSnackbar, token } = useContext(ThemeContext);
    const [checkList, setCheckList] = useState<ChecklistItem[]>([]);

    const [updateActivityContextMutation, { error: error }] = useMutation(updateActivityContextForSoundsScavengerHunt, {
        refetchQueries: [{ query: getPupilActivityForCommonDigitalChecklist, variables: { id: queryParams?.activity_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
    }, [error]);

    const items = isText ? checkListTextData?.checkList : checklistImageData;

    /** See the note above: each flavour keeps its own persisted shape. */
    const toStoredShape = (list: ChecklistItem[]): StoredTicks =>
        isText ? list.map(({ key, checked }) => ({ key, checked })) : list.map((i) => i.checked);

    const _onClick = (index: number, bool: boolean) => {
        if (token?.userType === TEACHER || readOnly) return;

        const newCheckList = [...checkList];

        newCheckList[index].checked = bool;
        setCheckList(newCheckList);

        let newPupilActivityContext: Record<string, StoredTicks> = {};

        // A shallow copy shares the item objects, so `checkList` already sees the flag set above.
        if (pupilActivityContext) {
            const parsedContext = JSON.parse(pupilActivityContext);

            parsedContext[digitalChecklistId] = toStoredShape(checkList);

            newPupilActivityContext = parsedContext;
        } else {
            newPupilActivityContext[digitalChecklistId] = toStoredShape(checkList);
        }

        updateActivityContextMutation({
            variables: {
                pupilActivityId: queryParams?.activity_id,
                pupilActivityContext: JSON.stringify(newPupilActivityContext)
            }
        });
    };

    const setIsChecked = (): ChecklistItem[] => {
        // Nothing saved yet, so the data's own `checked` flags stand as they are.
        if (!pupilActivityContext) return items;

        const parsedContext: StoredTicks = JSON.parse(pupilActivityContext)?.[digitalChecklistId];

        if (isText) {
            const savedByKey = parsedContext as { key?: string; checked?: boolean }[];

            return (items || []).map((item) => {
                const saved = savedByKey?.find((x) => x?.key === item?.key);

                item.checked = saved ? saved.checked : false;

                return item;
            });
        }

        const savedByIndex = parsedContext as boolean[];

        return (items || []).map((item, index) => {
            item.checked = savedByIndex?.[index] ? true : false;

            return item;
        });
    };

    useEffect(() => {
        setCheckList(setIsChecked());
    }, []);

    if (isText) {
        return (
            <div>
                <Heading1 customClass="mein_heading" centerText text={checkListTextData?.heading} />
                <br />
                <Paragraph>{checkListTextData?.description}</Paragraph>
                <br />
                {(checkList || []).map((item, index) => (
                    <div key={item.key} id={String(index)}>
                        <CommonCheckBox
                            className="dictionaryCheckbox"
                            style={{ pointerEvents: readOnly ? 'none' : undefined }}
                            checked={item.checked}
                            label={item.listItem}
                            onClick={() => _onClick(index, !item.checked)}
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <Grid container spacing="4">
                {(checkList || []).map((item, index) => {
                    return (
                        <Grid key={index} xs={12} sm={6} md={6} lg={4} item>
                            <Card className={`check_box_card top-${getTopicType(subject)}-border`}>
                                <img src={item?.imageUrl} className="digital-checklist-image" alt="check box" />

                                <div className="check_box_container">
                                    <CommonCheckBox
                                        checked={item.checked}
                                        labelPlacement="start"
                                        label={item.caption}
                                        onClick={() => _onClick(index, !item.checked)}
                                    />
                                </div>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </div>
    );
};

export default CommonDigitalChecklist;
