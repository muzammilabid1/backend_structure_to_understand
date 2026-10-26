/* eslint-disable @next/next/no-img-element */
import { useMutation, useQuery } from '@apollo/client';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Chip, Collapse, Grid } from '@mui/material';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { saveReadingNote } from '../../../../graphQl/mutations';
import { getClassReadingTopicForWeekByWeek, getGroupAcrossClassesReadingTopicForWeekByWeek } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { countWithPlural, getDaysFromIndex, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../../types/ILwpSchoolClass';
import { RefetchQueryObject } from '../../../../types/RefetchQueryObject';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonDot from '../../../Shared/CommonDot';
import CommonListWithIcon from '../../../Shared/CommonListWithIcon';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonStatus from '../../../Shared/CommonStatus';
import KeyToIcons from '../../../Shared/KeyToIcons';
import PupilBookHistoryModal from '../../../Shared/Modals/PupilBookHistoryModal';
import Heading2 from '../../../Shared/Typography/Heading2';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import ShowCountStatus from '../../ActivityGrid/ShowCountStatus';
import ProgressBarCard from '../../Cards/ProgressBarCard';
import TopOptions from '../TopOptions';
import EditReadingWeek from './EditReadingWeek';
import ReadingCompactView from './ReadingCompactView';
import ReadingEntriesDrawer from './ReadingEntriesDrawer';
import ReadingExpandedView from './ReadingExpandedView';

interface Options {
    subjects: string;
    pageView: string;
}

interface ReadingProps {
    options: Options;
    handleOptionsChange: (newOptions: Partial<Options>) => void;
    schoolClass: ILwpSchoolClassDetails;
}

const Reading = ({ options, handleOptionsChange, schoolClass }: ReadingProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [bookHistoryModal, setBookHistoryModal] = useState({ open: false, name: '', pupilId: null });
    const [addReadingNotesModal, setAddReadingNotesModal] = useState({ open: false, type: null });
    const [drawerState, setDrawerState] = useState({
        pupilFullname: null,
        pupilTopicId: null,
        pupilId: null,
        open: false
    });

    const readingTopicForWeekByWeekQuery = schoolClass?.isGroupAcrossClasses
        ? getGroupAcrossClassesReadingTopicForWeekByWeek
        : getClassReadingTopicForWeekByWeek;

    const refetchQuery: RefetchQueryObject = {
        query: readingTopicForWeekByWeekQuery,
        variables: { classId: router?.query?.class_id as string, topicId: router?.query?.id as string }
    };

    const {
        loading,
        error,
        data: readingTopicForWeekByWeekData
    } = useQuery(readingTopicForWeekByWeekQuery, {
        variables: { classId: router?.query?.class_id, topicId: router?.query?.id }
    });

    const [saveReadingNoteMutation, { loading: saveReadingNoteLoading }] = useMutation(saveReadingNote, {
        refetchQueries: [
            {
                query: readingTopicForWeekByWeekQuery,
                variables: { classId: router?.query?.class_id, topicId: router?.query?.id }
            }
        ],
        awaitRefetchQueries: true
    });

    const topicData = useMemo(
        () =>
            schoolClass?.isGroupAcrossClasses
                ? readingTopicForWeekByWeekData?.getGroupAcrossClassesReadingTopicForWeekByWeek
                : readingTopicForWeekByWeekData?.getClassReadingTopicForWeekByWeek,
        [readingTopicForWeekByWeekData, schoolClass]
    );

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    const _getStatisticsList = (readingTopicData) => {
        const completed = readingTopicData?.statistics?.completed || [];
        const inProgress = readingTopicData?.statistics?.inProgress || [];
        const notStarted = readingTopicData?.statistics?.notStarted || [];

        if (completed?.length || inProgress?.length || notStarted?.length) {
            return [
                { color: readingStatisticsHeaders.completed.color, count: completed?.length },
                { color: readingStatisticsHeaders.inProgress.color, count: inProgress?.length },
                { color: readingStatisticsHeaders.notStarted.color, count: notStarted?.length }
            ];
        } else {
            return [
                { color: readingStatisticsHeaders.completed.color, count: 0 },
                { color: readingStatisticsHeaders.inProgress.color, count: 0 },
                { color: readingStatisticsHeaders.notStarted.color, count: 1 }
            ];
        }
    };

    const _getFooter = (readingTopicData) => {
        const statuses = ['completed', 'inProgress', 'notStarted'];

        return statuses.map((status) => {
            const pupils = readingTopicData?.statistics?.[status] || [];
            const { name, color } = readingStatisticsHeaders[status];
            const count = pupils.length;

            const defaultTexts = {
                completed: 'Target met (0)',
                inProgress: 'In progress (0)',
                notStarted: 'Not started (0)'
            };

            const text = count > 0 ? `${name} (${count})` : defaultTexts[status];

            const popOverText = (
                <div>
                    <div className="align-items-center">
                        <CommonDot color={color} />
                        <Heading3 text={name} />
                    </div>
                    <div className="pupilTopic-popover-text-container mt5">
                        {count > 0 ? (
                            pupils.map((pupil) => <Paragraph key={pupil} customClass="pupilTopic-popover-text" text={pupil} />)
                        ) : (
                            <Paragraph customClass="pupilTopic-popover-text" text="(None)" />
                        )}
                    </div>
                </div>
            );

            return {
                color,
                text,
                popOverText
            };
        });
    };

    const setTopic = (id: string) => {
        router.push(`/class/${router.query.class_id}/readingweek/${id}`);
    };

    const getIconBehalfOnReadingTarget = (pupilTopic) => {
        const readingStars = pupilTopic?.earnedGoldStar ? pupilTopic?.silverStars + 1 : pupilTopic?.silverStars;

        if (readingStars === 0) return <ShowCountStatus imageType={`readingLog_zero`} format={'png'} number={0} />;

        return <ShowCountStatus imageType={`readingLog_zero`} format={'png'} number={readingStars} />;
    };

    const getIconBehalfOnReadingLogs = (pupilTopic) => {
        const readingStars = pupilTopic?.earnedGoldStar ? pupilTopic?.silverStars + 1 : pupilTopic?.silverStars;

        if (readingStars === 0) return <span className={`material-icons`}>remove</span>;

        if (pupilTopic?.earnedGoldStar) {
            return <ShowCountStatus imageType={`complete_reading`} />;
        }

        return <ShowCountStatus imageType={`uncomplete_reading`} number={readingStars} format="png" color="#FDC300" />;
    };

    const getIcon = (item, feedbacks) => {
        const findFeedback = feedbacks?.find((feedback) => moment(feedback?.bookReadAt).format('dddd').slice(0, 3) == item?.code);

        if (findFeedback?.isReadingWithGroup && findFeedback?.isReadAtHome) {
            return 'readingHomeClassIcon.png';
        }

        if (findFeedback?.isReadingWithGroup) {
            return 'team_teacher.svg';
        }

        if (findFeedback?.isReadAtSchool && findFeedback?.isReadAtHome) {
            return 'readingHomeClassIcon.png';
        }

        if (findFeedback?.isReadAtSchool) {
            return 'readingSchoolIcon.png';
        }

        if (findFeedback?.isReadAtHome) {
            return 'readingHomeIcon.png';
        }

        return null;
    };

    const onEntrieshandler = (pupilTopicId, pupilId, pupilFullname) => {
        setDrawerState({ pupilTopicId, pupilId, pupilFullname, open: true });
    };

    const head = getDaysFromIndex(topicData?.readingStartDay).map((item) => ({
        text: item.charAt(0),
        code: item
    }));

    const topicKeyMenuList = [];
    const isCurrentWeek = schoolClass?.currentReadingWeek?.id === topicData?.topicId;

    if (topicData && !topicData?.readingNote && (!topicData?.isReleased || isCurrentWeek)) {
        topicKeyMenuList?.push({
            text: 'Add teacher message',
            icon: 'comment',
            iconRight: true,
            onClick: () => setAddReadingNotesModal({ open: true, type: 'MESSAGE' })
        });
    }

    if (!isCurrentWeek && schoolClass?.currentReadingWeek) {
        topicKeyMenuList?.push({
            text: 'Jump to the current week',
            icon: 'rotate_left',
            iconRight: true,
            onClick: () => setTopic(schoolClass?.currentReadingWeek?.id)
        });
    }

    if (loading) return <CommonLoading />;

    return (
        <div>
            <TopOptions options={options} handleOptionsChange={handleOptionsChange} schoolClass={schoolClass}>
                <Grid container spacing={2}>
                    <Grid item lg={8} md={8} sm={12} xs={12}>
                        <Grid container justifyContent={'space-between'} alignItems={'center'} mb={4} flexWrap={'nowrap'}>
                            {topicData?.previousTopicId ? (
                                <NavigateBeforeIcon
                                    data-test="week-by-week-reading-topic-previous-button"
                                    onClick={() => setTopic(topicData?.previousTopicId)}
                                    className="cp"
                                />
                            ) : (
                                <span />
                            )}
                            <Grid textAlign={'center'}>
                                <Grid display={'flex'} gap={1} justifyContent={'center'} alignItems={'flex-end'} mb={1}>
                                    <Heading3
                                        text={`${topicData?.teacherTopicName} ${topicData?.readingTarget === 0 ? '- Holiday week' : isCurrentWeek ? '- This week' : ''}`}
                                    />

                                    {!topicData?.isReleased && (
                                        <Chip
                                            label={'Not yet released'}
                                            className="released_tag"
                                            sx={{
                                                backgroundColor: '#FDC300'
                                            }}
                                            size="small"
                                        />
                                    )}
                                </Grid>

                                <Paragraph
                                    dataTest="week-by-week-reading-topic-release-date"
                                    text={topicData?.activeDateString}
                                    customClass="active_date"
                                />
                            </Grid>

                            {topicData?.nextTopicId ? (
                                <NavigateNextIcon
                                    data-test="week-by-week-reading-topic-next-button"
                                    onClick={() => setTopic(topicData?.nextTopicId)}
                                    className="cp"
                                />
                            ) : (
                                <span />
                            )}
                        </Grid>
                        <ProgressBarCard
                            statistics={
                                topicData?.readingTarget === 0
                                    ? [{ color: readingStatisticsHeaders.targetNotSet.color, count: 1 }]
                                    : _getStatisticsList(topicData)
                            }
                            footer={
                                topicData?.readingTarget === 0
                                    ? [{ text: readingStatisticsHeaders.targetNotSet.name }]
                                    : _getFooter(topicData)
                            }
                            hover={topicData?.readingTarget === 0 ? false : true}
                            className="reading-topic-detail-progress-bar-card"
                        />
                    </Grid>
                    <Grid item lg={4} md={4} sm={12} xs={12}>
                        <Grid border={'1px solid #D6D1CB'} borderRadius={`4px`} p={2}>
                            <Grid container justifyContent={'space-between'} alignItems={'center'}>
                                <Paragraph text="Target this week" />
                                {!topicData?.isReleased && (
                                    <CommonIconButton
                                        onClick={() => setAddReadingNotesModal({ open: true, type: 'TARGET' })}
                                        icon="edit"
                                        size="small"
                                    />
                                )}
                            </Grid>
                            <Heading2 text={countWithPlural('day', topicData?.readingTarget)} />
                        </Grid>
                        <CommonListWithIcon list={topicKeyMenuList} />
                    </Grid>
                </Grid>
            </TopOptions>

            {topicData?.isReleased && (
                <Grid mb={3} container justifyContent={'flex-end'}>
                    <KeyToIcons list={keyToIcons} />
                </Grid>
            )}
            {topicData?.readingNote && (!topicData?.isReleased || isCurrentWeek) && (
                <CommonCard background="#FFF6D9" csx={{ mb: 3 }} className="message_pupils_text">
                    <Grid display={'flex'} alignItems={'center'} gap={2}>
                        <Grid>
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/book_with_yellow_bg.svg`}
                            />
                        </Grid>
                        <Grid>
                            <b>Message shown to pupils for this week:</b>
                            {` “${topicData?.readingNote}” - ${schoolClass?.mainTeacher?.nameForChildren}`}
                        </Grid>
                        <Grid>
                            <CommonIconButton
                                onClick={() => setAddReadingNotesModal({ open: true, type: 'MESSAGE' })}
                                icon="edit"
                                size="small"
                            />
                        </Grid>
                    </Grid>
                </CommonCard>
            )}

            <Collapse in={options.pageView == 'EXPANDED' && topicData?.isReleased} unmountOnExit>
                <ReadingExpandedView
                    classReadingTopic={topicData}
                    query={readingTopicForWeekByWeekQuery}
                    setBookHistoryModal={setBookHistoryModal}
                    onEntrieshandler={onEntrieshandler}
                    getIconBehalfOnReadingTarget={getIconBehalfOnReadingTarget}
                    getIconBehalfOnReadingLogs={getIconBehalfOnReadingLogs}
                    head={head}
                    getIcon={getIcon}
                />
            </Collapse>

            <Collapse in={options.pageView == 'COMPACT' && topicData?.isReleased} unmountOnExit>
                <ReadingCompactView
                    classReadingTopic={topicData}
                    query={readingTopicForWeekByWeekQuery}
                    setBookHistoryModal={setBookHistoryModal}
                    onEntrieshandler={onEntrieshandler}
                    getIconBehalfOnReadingTarget={getIconBehalfOnReadingTarget}
                    getIconBehalfOnReadingLogs={getIconBehalfOnReadingLogs}
                    head={head}
                    getIcon={getIcon}
                />
            </Collapse>

            {!topicData?.isReleased && (
                <Grid my={3}>
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'Not released to any pupils yet'}
                    />
                </Grid>
            )}

            <PupilBookHistoryModal
                open={bookHistoryModal?.open}
                setOpen={setBookHistoryModal}
                name={bookHistoryModal?.name}
                pupilId={bookHistoryModal?.pupilId}
            />

            <EditReadingWeek
                saveReadingNoteMutation={saveReadingNoteMutation}
                saveReadingNoteLoading={saveReadingNoteLoading}
                classReadingTopic={topicData}
                addReadingNotesModal={addReadingNotesModal}
                setAddReadingNotesModal={setAddReadingNotesModal}
            />

            <ReadingEntriesDrawer
                drawerState={drawerState}
                setDrawerState={setDrawerState}
                schoolClass={schoolClass}
                classReadingTopic={topicData}
                refetchQuery={refetchQuery}
            />
        </div>
    );
};

export default Reading;

const keyToIcons = [
    {
        icon: 'readingHomeIcon.svg',
        name: 'Read at home'
    },
    {
        icon: 'readingSchoolIcon.svg',
        name: 'Read at school'
    },
    {
        icon: 'team_teacher.svg',
        name: 'Read as group'
    },
    {
        icon: 'readingLogRegisterIcon.png',
        name: 'Holiday'
    },
    {
        icon: 'key_reading_target.svg',
        name: 'Reading target not completed'
    },
    {
        icon: 'complete_reading.svg',
        name: 'Reading target completed'
    },
    {
        icon: 'pupil_status.svg',
        name: `Pupil status (colour shown at the side of the pupil's name)`
    }
];

const readingStatisticsHeaders = {
    notStarted: {
        name: 'No reading',
        color: '#D0D8FF'
    },
    inProgress: {
        name: 'Less than target',
        color: 'rgba(136, 125, 255, 0.6)'
    },
    completed: {
        name: 'Target met',
        color: '#887DFF'
    },
    targetNotSet: {
        name: '(No reading target this week)',
        color: '#d6d1cb'
    }
};
