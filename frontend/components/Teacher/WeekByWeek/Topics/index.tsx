import { gql, useQuery } from '@apollo/client';
import MenuBookSharpIcon from '@mui/icons-material/MenuBookSharp';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Chip, Collapse, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import UpdateTopicModal from '../../../../components/Teacher/Modals/UpdateTopicModal';
import { getClassTopicForWeekByWeek } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { showDate, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpPupil, ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import CommonDot from '../../../Shared/CommonDot';
import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import KeyToIcons from '../../../Shared/KeyToIcons';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import ProgressBarCard from '../../Cards/ProgressBarCard';
import TopOptions from '../TopOptions';
import ScrapbookEntriesDrawer from './ScrapbookEntriesDrawer';
import TopicEntriesDrawer from './TopicEntriesDrawer';
import TopicsCompactView from './TopicsCompactView';
import TopicsExpandedView from './TopicsExpandedView';

const getClassTopic = gql`
    query getClassTopic($id: String!) {
        getClassTopic(id: $id) {
            id
            releaseDate
            dueDate
            teacherMessage
            released
            topic {
                id
                teacherTopicName
                teacherPdf
                isTeacherPdfRequired
                teacherDescription
                scrapbookPrompt
                hasSetByTeacherSteps
                yearGroups {
                    year
                }
                domains {
                    subject {
                        name
                    }
                }
            }
        }
    }
`;

interface Options {
    subjects: string;
    pageView: string;
}

interface TopicsProps {
    options: Options;
    handleOptionsChange: (value: Partial<Options>) => void;
    schoolClass: ILwpSchoolClassDetails;
}

const scrapbookEntriesDrawerInitialState = {
    pupilFullname: null,
    pupilId: null,
    open: false
};

const Topics = ({ options, handleOptionsChange, schoolClass }: TopicsProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [editModal, setEditModal] = useState<boolean>(false);

    const [drawerState, setDrawerState] = useState<{
        pupilFullname: string | null;
        pupilTopicId: string | null;
        pupilId: string | null;
        open: boolean;
    }>({
        pupilFullname: null,
        pupilTopicId: null,
        pupilId: null,
        open: false
    });

    const [scrapbookEntriesDrawerState, setScrapbookEntriesDrawerState] = useState<{
        pupilFullname: string | null;
        pupilId: string | null;
        open: boolean;
    }>(scrapbookEntriesDrawerInitialState);

    const {
        loading,
        error,
        data: topic
    } = useQuery(getClassTopicForWeekByWeek, {
        variables: { classId: router?.query?.class_id, topicId: router?.query?.id }
    });

    const topicDetails = topic?.getClassTopicForWeekByWeek;

    const {
        loading: classTopicLoading,
        error: classTopicError,
        data: classTopicData
    } = useQuery(getClassTopic, {
        variables: { id: topic?.getClassTopicForWeekByWeek?.topicId },
        skip: !editModal
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }

        if (classTopicError?.message) {
            callSnackbar(classTopicError, 'error');
        }
    }, [error, classTopicError]);

    const getStatistics = () => {
        const { completed, inProgress, notStarted } = topic?.getClassTopicForWeekByWeek?.statistics || '';

        if (completed || notStarted || inProgress) {
            return [
                { color: '#65B32E', count: completed.length },
                { color: '#99C95D', count: inProgress.length },
                { color: '#FAF3B3', count: notStarted.length }
            ];
        } else {
            return [
                { color: '#65B32E', count: 0 },
                { color: '#99C95D', count: 0 },
                { color: '#FAF3B3', count: 1 }
            ];
        }
    };

    const _getFooter = () => {
        const doneActivity = topic?.getClassTopicForWeekByWeek?.statistics?.completed;
        const watchedVideo = topic?.getClassTopicForWeekByWeek?.statistics?.inProgress;
        const notStartedYet = topic?.getClassTopicForWeekByWeek?.statistics?.notStarted;

        return [
            {
                color: '#65B32E',
                text: doneActivity?.length > 0 ? `Done an activity (${doneActivity?.length})` : 'Completed (0)',
                popOverText: (
                    <div>
                        <div className="align-items-center">
                            <CommonDot color={'#65B32E'} />
                            <Heading3 text="Done an activity" />
                        </div>
                        <div className="mt5">
                            {doneActivity?.length > 0 ? (
                                (doneActivity || [])?.map((pupil) => <Paragraph customClass="pupilTopic-popover-text" text={pupil} />)
                            ) : (
                                <Paragraph customClass="pupilTopic-popover-text" text={'(None)'} />
                            )}
                        </div>
                    </div>
                )
            },
            {
                color: '#99C95D',
                text: `Watched video only (${watchedVideo?.length})`,
                popOverText: (
                    <div className="class-topic-pupils-popover">
                        <div className="align-items-center">
                            <CommonDot color={'99C95D'} />
                            <Heading3 text="Watched video only" />
                        </div>
                        <div className="mt5">
                            {watchedVideo?.length > 0 ? (
                                (watchedVideo || [])?.map((pupil) => <Paragraph customClass="pupilTopic-popover-text" text={pupil} />)
                            ) : (
                                <Paragraph customClass="pupilTopic-popover-text" text={'(None)'} />
                            )}
                        </div>
                    </div>
                )
            },
            {
                color: '#FAF3B3',
                text: notStartedYet?.length > 0 ? `Not started (${notStartedYet?.length})` : 'Not started (0)',
                popOverText: (
                    <div>
                        <div className="align-items-center">
                            <CommonDot color={'#FAF3B3'} />
                            <Heading3 text="Not started" />
                        </div>
                        <div className="mt5">
                            {notStartedYet?.length > 0 ? (
                                (notStartedYet || [])?.map((pupil) => <Paragraph customClass="pupilTopic-popover-text" text={pupil} />)
                            ) : (
                                <Paragraph customClass="pupilTopic-popover-text" text={'(None)'} />
                            )}
                        </div>
                    </div>
                )
            }
        ];
    };

    const setTopic = (id: string) => {
        router.push(`/class/${router.query.class_id}/topic/${id}`);
    };

    const onEntrieshandler = (pupilTopicId, pupilId, pupilFullname) => {
        setDrawerState({ pupilTopicId, pupilId, pupilFullname, open: true });
    };

    const topicKeyMenuList = [
        {
            text: 'Edit topic',
            icon: 'edit',
            iconRight: true,
            dataTest: 'week-by-week-edit-topic-btn',
            onClick: () => setEditModal(!editModal)
        },
        {
            text: 'Preview topic',
            icon: 'visibility',
            iconRight: true,
            onClick: () => {
                const classTopicId = topic?.getClassTopicForWeekByWeek?.topicId;

                window.open(
                    `${location.protocol}//${location.host}/previewtopic/${topic?.getClassTopicForWeekByWeek?.staticTopicId}?classTopicId=${classTopicId}`,
                    '_blank',
                    `width=${window.innerWidth}, height=${window.innerHeight}`
                );
            }
        }
    ];

    if (topic?.getClassTopicForWeekByWeek?.teacherPdf) {
        topicKeyMenuList.push({
            text: 'Resources (PDF)',
            icon: 'file_download',
            iconRight: true,
            onClick: () => {
                window.location.href = topic?.getClassTopicForWeekByWeek?.teacherPdf;
            }
        });
    }

    const scrapbookEntrieshandler = (pupil: ILwpPupil) => {
        setScrapbookEntriesDrawerState({ open: true, pupilId: pupil?.id, pupilFullname: pupil?.fullname });
    };

    const showScrapbookEntriesButton: boolean = schoolClass?.school?.isScrapbookEnabledForSchool && schoolClass?.isReadyTeddyEnabled;

    if (loading) return <CommonLoading />;

    return (
        <div>
            <TopOptions options={options} handleOptionsChange={handleOptionsChange} schoolClass={schoolClass}>
                <Grid container spacing={2}>
                    <Grid item lg={8} md={8} sm={12} xs={12}>
                        <Grid container justifyContent={'space-between'} alignItems={'center'} mb={4} flexWrap={'nowrap'}>
                            {topic?.getClassTopicForWeekByWeek?.previousTopicId ? (
                                <NavigateBeforeIcon
                                    onClick={() => setTopic(topic?.getClassTopicForWeekByWeek?.previousTopicId)}
                                    className="cp"
                                />
                            ) : (
                                <span />
                            )}
                            <Grid textAlign={'center'}>
                                <Grid display={'flex'} gap={1} justifyContent={'center'} alignItems={'center'} mb={1} flexWrap={'wrap'}>
                                    <Heading3
                                        text={topic?.getClassTopicForWeekByWeek?.teacherTopicName}
                                        dataTest="week-by-week-topic-name"
                                    />

                                    {!topic?.getClassTopicForWeekByWeek?.isRegisterationClassTopic && (
                                        <Chip
                                            label={topic?.getClassTopicForWeekByWeek?.schoolClassName}
                                            sx={{
                                                height: 22
                                            }}
                                            className="released_tag"
                                        />
                                    )}

                                    {!topic?.getClassTopicForWeekByWeek?.isReleased && (
                                        <Chip
                                            label={'Not yet released'}
                                            sx={{
                                                backgroundColor: '#FDC300'
                                            }}
                                            size="small"
                                            className="released_tag"
                                        />
                                    )}
                                </Grid>
                                <Paragraph
                                    customClass="active_date"
                                    text={`${showDate({ date: topic?.getClassTopicForWeekByWeek?.releaseDate })}${
                                        topic?.getClassTopicForWeekByWeek?.dueDate !== null || false
                                            ? ` - ${showDate({ date: topic?.getClassTopicForWeekByWeek?.dueDate })}`
                                            : ''
                                    }`}
                                />
                            </Grid>
                            {topic?.getClassTopicForWeekByWeek?.nextTopicId ? (
                                <NavigateNextIcon onClick={() => setTopic(topic?.getClassTopicForWeekByWeek?.nextTopicId)} className="cp" />
                            ) : (
                                <span />
                            )}
                        </Grid>
                        <ProgressBarCard statistics={getStatistics()} footer={_getFooter()} />
                    </Grid>

                    <Grid item lg={4} md={4} sm={12} xs={12}>
                        <CommonListWithIcon list={topicKeyMenuList} />
                    </Grid>

                    {schoolClass?.school?.isScrapbookEnabledForSchool && topicDetails?.scrapbookPrompt ? (
                        <Grid item xs={12}>
                            <div className="week-by-week-scrapbook-prompt-card">
                                <div className="week-by-week-scrapbook-prompt-header">
                                    <MenuBookSharpIcon className="week-by-week-scrapbook-prompt-icon" />
                                    <Heading3 text="SCRAPBOOK PROMPT" />
                                </div>
                                <Paragraph dataTest="week-by-week-scrapbook-prompt">“{topicDetails?.scrapbookPrompt}”</Paragraph>
                            </div>
                        </Grid>
                    ) : null}
                </Grid>
            </TopOptions>

            <Grid mb={3} container justifyContent={'flex-end'}>
                <KeyToIcons list={keyToIcons} />
            </Grid>

            <Collapse in={options.pageView == 'COMPACT' && topic?.getClassTopicForWeekByWeek?.isReleased} unmountOnExit>
                <TopicsCompactView
                    getPupilTopics={topic?.getClassTopicForWeekByWeek?.pupilTopics}
                    onEntrieshandler={onEntrieshandler}
                    showScrapbookEntriesButton={showScrapbookEntriesButton}
                    scrapbookEntrieshandler={scrapbookEntrieshandler}
                />
            </Collapse>

            <Collapse in={options.pageView == 'EXPANDED' && topic?.getClassTopicForWeekByWeek?.isReleased} unmountOnExit>
                <TopicsExpandedView
                    getPupilTopics={topic?.getClassTopicForWeekByWeek?.pupilTopics}
                    onEntrieshandler={onEntrieshandler}
                    showScrapbookEntriesButton={showScrapbookEntriesButton}
                    scrapbookEntrieshandler={scrapbookEntrieshandler}
                />
            </Collapse>

            {!topic?.getClassTopicForWeekByWeek?.isReleased && (
                <Grid mb={3}>
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'Not released to any pupils yet'}
                    />
                </Grid>
            )}

            {topic?.getClassTopicForWeekByWeek?.topicWillReleasedFor.length > 0 && (
                <Grid mt={3}>
                    <Heading3 text="This topic will be released to:" />
                    <Grid container gap={2} mt={1}>
                        {topic?.getClassTopicForWeekByWeek?.topicWillReleasedFor?.map((pupil) => {
                            return (
                                <Chip
                                    className="released_to"
                                    label={pupil?.fullname}
                                    sx={{
                                        border: '1px solid #999591',
                                        backgroundColor: '#F5F5F5',
                                        fontSize: '16px'
                                    }}
                                />
                            );
                        })}
                    </Grid>
                </Grid>
            )}

            {topic?.getClassTopicForWeekByWeek?.topicNotSetFor.length > 0 && (
                <Grid mt={3}>
                    <Heading3 text="Not set for the following pupils:" />
                    <Grid container gap={2} mt={1}>
                        {topic?.getClassTopicForWeekByWeek?.topicNotSetFor?.map((pupil) => {
                            return (
                                <Chip
                                    className="not_released_to"
                                    label={pupil?.fullname}
                                    sx={{
                                        border: '1px solid #999591',
                                        backgroundColor: '#F5F5F5',
                                        fontSize: '16px'
                                    }}
                                />
                            );
                        })}
                    </Grid>
                </Grid>
            )}

            <UpdateTopicModal
                open={editModal}
                setOpen={() => setEditModal(!editModal)}
                primaryText={'Update topic'}
                topicData={classTopicData?.getClassTopic}
                isLoading={classTopicLoading}
                showSetByTeacherDetails={true}
            />

            <TopicEntriesDrawer drawerState={drawerState} setDrawerState={setDrawerState} schoolClass={schoolClass} />

            {scrapbookEntriesDrawerState?.open ? (
                <ScrapbookEntriesDrawer
                    drawerState={scrapbookEntriesDrawerState}
                    schoolClass={schoolClass}
                    handleOnClose={() => setScrapbookEntriesDrawerState(scrapbookEntriesDrawerInitialState)}
                />
            ) : null}
        </div>
    );
};

export default Topics;

const keyToIcons = [
    {
        icon: 'watch_video.svg',
        name: 'Watched video only'
    },
    {
        icon: 'complete_task.svg',
        name: 'Topic completed'
    },
    {
        icon: 'green_tick.svg',
        name: 'Activity done'
    },
    {
        icon: 'pupil_status.svg',
        name: `Pupil status (colour shown at the side of the pupil's name)`
    }
];
