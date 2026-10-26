import { gql, useLazyQuery } from '@apollo/client';
import { Alert, Divider } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { useDelegatedClaims } from '../../../../context/DelegatedClaimsContext';
import { ADMIN, MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import PreviousGroupReading from './PreviousGroupReading';
import ReadingGroupForm from './ReadingGroupForm';

const feedbackFields = `
        id
        pupilComment
        parentComment
        logCreatedAt
        className
        pupilCount
        photos {
            id
            filename
        }
        school {
            id
        }
        bookName
        bookReadAt
        pageNumber
        isBookFinished
        comment
        privateNote
        includeInReadingTarget
        type
        feedbackReplies {
            id
            reply
            logCreatedAt
            logUpdatedAt
            type
            originalFeedbackReplyId
            originalFeedbackReplyDeletedAt
            sticker {
                alt
                id
                imageUrl
            }
            logCreatedBy {
                id
                nameForChildren
            }
            }
        tickedAt
        tickedBy {
            nameForChildren
        }
        audios {
            id
            filename
        }
        pupil {
            id
            fullname
        }
        pupils {
            id
        }
        userId
        userType
        logCreatedBy {
            id
            firstname
            lastname
            nameForChildren
            type
        }
        description
        sharingAllowed
        readingType
        userName
        pupilTopic {
            id
        }
        activity {
            id
            earnedStar
            topic {
                id
            }
            activity {
                name
                topic {
                    id
                    teacherTopicName
                }
            }
        }
        lastAction {
                updatedAt
        }
        originalFeedbackId
        entryDeletedAt
        reasonToDelete
`;

const getFeedbackForGroupReading = gql`
    query getFeedbackForGroupReading($schoolId: String!, $classId: String, $offset: Float, $limit: Float, $pupilIds: [String!]) {
        getFeedbackForGroupReading(schoolId: $schoolId, classId: $classId, offset: $offset, limit: $limit, pupilIds: $pupilIds) {
            total
            limit
            offset
            results {
                ${feedbackFields}
            }
        }

    }
`;

const schoolClass = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            school {
                schoolName
                id
            }
        }
    }
`;

interface ReadingGroupProps {
    classData?: { schoolClass: ILwpSchoolClassDetails };
}

interface ReadingGroupState {
    mainLoading: boolean;
    editActivity?: string | null;
    showPreviousGroupLoading?: boolean;
    pupilIds?: string[];
    // Add other properties if necessary
}

const ReadingGroup = ({ classData = null }: ReadingGroupProps) => {
    const { token, callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const queryParams = useParams();
    const { setClaims } = useDelegatedClaims();

    const [feeds, setFeeds] = useState([]);
    const [readingGroupState, setState] = useState<ReadingGroupState>({
        mainLoading: false,
        editActivity: null,
        showPreviousGroupLoading: false,
        pupilIds: []
    });
    const isRegistrationClass = classData?.schoolClass?.isRegistrationClass;
    const parentClassId = classData?.schoolClass?.parentClass?.id;
    const pupilIdsForGroup = classData?.schoolClass?.pupils?.map((x) => x.id);
    const forSchool = router?.asPath === '/log-reading' || router?.pathname === '/school/[school_id]/log-reading';

    const setReadingGroupState = (newObj) => {
        setState((pre) => ({ ...pre, ...newObj }));
    };

    const [getPupilActivityFeedsQuery, { loading, error, data: pupilActivityFeeds }] = useLazyQuery(getFeedbackForGroupReading);
    const [schoolClassDataQuery, { loading: schoolClassLoading, error: schoolClassError, data: schoolClassData }] =
        useLazyQuery(schoolClass);

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }

        if (schoolClassError?.message) {
            callSnackbar(schoolClassError, 'error');
        }
    }, [error, schoolClassError]);

    useEffect(() => {
        if (!forSchool && token?.userType === ADMIN) {
            schoolClassDataQuery({ variables: { id: queryParams?.class_id } });
        }
    }, [forSchool]);

    const schoolId = token?.userType === ADMIN ? schoolClassData?.schoolClass?.school?.id || queryParams?.school_id : token?.schoolId;

    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <>
            <div
                className="reading_group"
                style={{ display: readingGroupState?.mainLoading ? 'none' : '' }}
                data-test={'log-reading-section'}>
                {forSchool ? (
                    <>
                        <CommonStatus
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Book_Open_Purple.png`}
                            imageAlt={'Open book'}
                            heading="Add a reading log entry"
                        />
                        <br />
                    </>
                ) : (
                    ''
                )}

                <Alert severity="info" className="reading-group-info">
                    Add a reading log entry for a single pupil or for multiple pupils at once. Select the pupil(s) you are reading with, and
                    fill in the details.
                </Alert>
                <br />
                <div className="reading_group_container">
                    <ReadingGroupForm
                        feedbackFields={feedbackFields}
                        getPupilActivityFeedsQuery={getPupilActivityFeedsQuery}
                        setFeeds={setFeeds}
                        setReadingGroupState={setReadingGroupState}
                        parentClassId={parentClassId}
                        isRegistrationClass={isRegistrationClass}
                        pupilIdsForGroup={pupilIdsForGroup}
                        forSchool={forSchool}
                        schoolId={schoolId}
                    />
                    <Divider orientation="vertical" flexItem className="reading_group_divider" />
                    <PreviousGroupReading
                        pupilActivityFeeds={pupilActivityFeeds}
                        loading={loading || schoolClassLoading}
                        getPupilActivityFeedsQuery={getPupilActivityFeedsQuery}
                        setFeeds={setFeeds}
                        feeds={feeds}
                        readingGroupState={readingGroupState}
                        parentClassId={parentClassId}
                        isRegistrationClass={isRegistrationClass}
                        pupilIdsForGroup={pupilIdsForGroup}
                        classData={classData}
                        schoolId={schoolId}
                    />
                </div>
            </div>

            <div style={{ display: readingGroupState?.mainLoading ? '' : 'none' }}>
                <CommonLoading />
            </div>
        </>
    );
};

export default ReadingGroup;
