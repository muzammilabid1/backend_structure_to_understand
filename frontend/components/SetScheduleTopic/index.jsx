import { gql, useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { getYearGroups, handleErrorSnackbar, ThemeContext } from '../../shared/Services/handler';
import LWPButton from '../Shared/Button/LWPButton';
import CommonLoading from '../Shared/CommonLoading';
import CommonStatus from '../Shared/CommonStatus';
import ScrapbookPromptPreviewForTopicSchedule from '../Shared/ScrapbookPromptPreviewForTopicSchedule';
import Heading2 from '../Shared/Typography/Heading2';
import Paragraph from '../Shared/Typography/Paragraph';
import ScheduleTopicForm from './ScheduleTopicForm';

const topic = gql`
    query topic($id: String!) {
        topic(id: $id) {
            id
            parentTopicName
            teacherTopicName
            teacherPdf
            scrapbookPrompt
            teacherDescription
            hasSetByTeacherSteps
            yearGroups {
                year
            }
            domains {
                subject {
                    name
                    id
                }
            }
        }
    }
`;

const getSchoolForSetScheduleTopic = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            isScrapbookEnabledForSchool
        }
    }
`;

const SetScheduleTopic = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const queryParams = useParams();

    const {
        loading,
        error,
        data: topicData
    } = useQuery(topic, {
        variables: { id: queryParams?.topic_id }
    });

    const {
        loading: schoolLoading,
        error: schoolError,
        data: schoolData
    } = useQuery(getSchoolForSetScheduleTopic, {
        variables: { id: queryParams?.school_id }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, schoolError);
    }, [error, schoolError]);

    const schoolDetails = schoolData?.getSchool;

    if (loading || schoolLoading) return <CommonLoading />;

    return (
        <div className="topic_libary_container">
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/set-topic-child.png`}
                imageAlt={'teacher-img'}
                heading={
                    topicData?.topic?.teacherTopicName?.length ? topicData?.topic?.teacherTopicName : topicData?.topic?.parentTopicName
                }
                subHeading={`${getYearGroups(topicData?.topic?.yearGroups)} · ${topicData?.topic?.domains
                    ?.map((domain) => domain?.subject?.name)
                    .join(', ')}`}
            />

            <div className="topic-preview-and-resources">
                <LWPButton
                    btnText="Preview topic"
                    startIcon="visibility"
                    color="inherit"
                    variant="text"
                    size="medium"
                    onClick={() => {
                        window.open(
                            `${location.protocol}//${location.host}/previewtopic/${topicData?.topic?.id}`,
                            '_blank',
                            `width=${window.innerWidth}, height=${window.innerHeight}`
                        );
                    }}
                />
                {topicData?.topic?.teacherPdf && (
                    <LWPButton
                        btnText="Resources (PDF)"
                        startIcon="download"
                        color="inherit"
                        variant="text"
                        size="medium"
                        onClick={() => {
                            window.location.href = topicData?.topic?.teacherPdf;
                        }}
                    />
                )}
            </div>
            {topicData?.topic?.teacherDescription ? (
                <>
                    <br />
                    <Paragraph text={topicData?.topic?.teacherDescription} />
                </>
            ) : (
                ''
            )}
            <br />

            {schoolDetails?.isScrapbookEnabledForSchool && topicData?.topic?.scrapbookPrompt ? (
                <>
                    <ScrapbookPromptPreviewForTopicSchedule scrapbookPrompt={topicData?.topic?.scrapbookPrompt} />
                    <br />
                </>
            ) : null}

            <Heading2 text="Schedule topic" />
            <br />
            <Paragraph text={'Choose the full programme classes and groups in which you want to schedule this topic.'} />
            <br />
            <ScheduleTopicForm topicData={topicData?.topic} />
        </div>
    );
};

export default SetScheduleTopic;
