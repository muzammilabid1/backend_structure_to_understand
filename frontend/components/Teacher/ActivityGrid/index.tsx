import { useQuery } from '@apollo/client';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Chip, Divider, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from '@mui/material/';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { getActivityGridDataForGroupAcrossClasses, getClassPupilsForRegisterTable } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, READING, readingAsASubjectName } from '../../../shared/Constant';
import { capitalizeFirstLetter, getPupilStatusBorderColor, showDate, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../types/ILwpSchoolClass';
import CommonButtonGroup from '../../Shared/CommonButtonGroup';
import Heading3 from '../../Shared/Typography/Heading3';
import CommonLoading from './../../Shared/CommonLoading';
import CommonPopOver from './../../Shared/CommonPopOver';
import CommonStatus from './../../Shared/CommonStatus';
import Paragraph from './../../Shared/Typography/Paragraph';
import ShowCountStatus from './ShowCountStatus';
import ShowPupilTopicProgress from './ShowPupilTopicProgress';

type ActivityGridProps = {
    classData: ILwpSchoolClassDetails;
};

const ActivityGrid = ({ classData }: ActivityGridProps) => {
    const isGroupAcrossClasses = classData?.isGroupAcrossClasses ?? false;
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const queryParams = router?.query;

    const [isScroll, setIsScroll] = useState(false);
    const [pupilClassTopics, setPupilClassTopics] = useState([]);
    const [showActivityCounts, setShowActivityCounts] = useState(false);
    const [subjects, setSubjects] = useState([]);

    const registerTableContianer = useRef(null);

    const {
        loading,
        error: error,
        data: classPupils
    } = useQuery(isGroupAcrossClasses ? getActivityGridDataForGroupAcrossClasses : getClassPupilsForRegisterTable, {
        variables: { id: queryParams?.class_id },
        skip: !queryParams?.class_id
    });

    const responseKey = isGroupAcrossClasses ? 'getActivityGridDataForGroupAcrossClasses' : 'getClassPupilsForRegisterTable';

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    useEffect(() => {
        registerTableContianer.current?.scrollTo(registerTableContianer.current.scrollWidth, 0);
    }, []);

    const getIconBehalfOnEarnedStars = (pupilTopic) => {
        const earnedStars = pupilTopic?.totalEarnedStars;

        if (!showActivityCounts && !!earnedStars) {
            return <ShowCountStatus imageType={`complete_task`} />;
        }

        if (earnedStars == 0) {
            return <ShowCountStatus imageType={`watch_video`} />;
        }

        if (earnedStars > 0) {
            return <ShowCountStatus imageType={`topic`} number={earnedStars} />;
        }
    };

    const getIconBehalfOnReadingLogs = (pupilTopic) => {
        const readingStars = pupilTopic?.earnedGoldStar ? pupilTopic?.silverStars + 1 : pupilTopic?.silverStars;

        if (readingStars === 0) return <span className={`material-icons remove`}>remove</span>;

        if (pupilTopic?.earnedGoldStar) {
            if (!showActivityCounts) {
                return <ShowCountStatus imageType={`complete_reading`} />;
            }

            return <ShowCountStatus imageType={`done_reading`} number={readingStars} />;
        }

        return <ShowCountStatus imageType={`uncomplete_reading`} number={readingStars} format="png" color="#FDC300" />;
    };

    const getIconBehalfOnReadingTarget = (pupilTopic) => {
        const readingStars = pupilTopic?.earnedGoldStar ? pupilTopic?.silverStars + 1 : pupilTopic?.silverStars;

        if (readingStars === 0 && showActivityCounts) return <span className={`material-icons remove`}>remove</span>;

        if (!showActivityCounts) {
            return <ShowCountStatus imageType={`readingLogZero`} format={'png'} />;
        }

        return <ShowCountStatus imageType={`readingLogZero`} format={'png'} number={readingStars} color="#999591" />;
    };

    useEffect(() => {
        const pupilClassTopics = classPupils?.[responseKey]?.classTopics || [];

        const subjectCountMap = new Map<string, { name: string; length: number; active: boolean }>();

        pupilClassTopics.forEach((item) => {
            const staticTopicSubjects = item?.staticTopicSubjects || [];

            staticTopicSubjects.forEach((subject) => {
                if (subjectCountMap.has(subject)) {
                    subjectCountMap.get(subject)!.length += 1;
                } else {
                    subjectCountMap.set(subject, { name: subject, length: 1, active: true });
                }
            });

            if (item?.isReadingTopic) {
                if (subjectCountMap.has(READING)) {
                    subjectCountMap.get(READING)!.length += 1;
                } else {
                    subjectCountMap.set(READING, { name: READING, length: 1, active: true });
                }
            }
        });

        const subjectArray = Array.from(subjectCountMap.values());

        setPupilClassTopics(pupilClassTopics);
        setSubjects(subjectArray);
    }, [classPupils?.[responseKey]]);

    const sideScroll = (element, speed, distance, step) => {
        let scrollAmount = 0;
        const slideTimer = setInterval(() => {
            element.scrollLeft += step;
            scrollAmount += Math.abs(step);
            if (scrollAmount >= distance) {
                clearInterval(slideTimer);
            }
        }, speed);
    };

    useEffect(() => {
        const tableContainer = document.getElementsByClassName('table-container');
        const scrollButton = tableContainer[0]?.scrollWidth > tableContainer[0]?.clientWidth;

        setIsScroll(scrollButton);
    }, [classPupils, subjects]);

    const filterBySubject = (sub) => {
        const activeSubjects = subjects.filter((subject) => subject.active === true);

        if (activeSubjects.length === 1 && activeSubjects[0].name === sub.name) {
            return;
        }

        const UpdatedSubjects = subjects.map((subject) => {
            if (subject.name === sub.name) {
                return { ...subject, active: !subject.active };
            }

            return subject;
        });

        setSubjects(UpdatedSubjects);
    };

    const getIsOtherClassTopic = (topic) => {
        if (topic?.staticTopicName === readingAsASubjectName) return false;

        return topic?.topicClassId !== queryParams?.class_id;
    };

    return (
        <div className="register-table-container activity-grid-table-container">
            {!loading && !classPupils?.[responseKey]?.['pupils']?.length ? (
                <div className="register-table-no-topic">
                    <Paper>
                        <CommonStatus
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                            imageAlt={''}
                            heading={'No pupils'}
                            subHeading={
                                classData?.school?.misName === null
                                    ? 'There are currently no pupils in this class. Click below to start adding pupils to this class.'
                                    : `Please check that data in ${classData?.school?.misName} is up to date.`
                            }
                        />
                    </Paper>
                </div>
            ) : (
                <>
                    {subjects?.length > 0 ? (
                        <Grid container justifyContent={'space-between'} sx={{ background: '#fff' }} p={4} gap={2}>
                            <Grid item gap={1} display={'flex'} flexDirection={'column'}>
                                <Heading3 text="Currently showing" />
                                <Grid display={'flex'} gap={2} className="activity-grid-subject-filter" flexWrap={'wrap'}>
                                    {subjects?.map((subject) => (
                                        <CommonButtonGroup
                                            groupBtn={[subject?.name]}
                                            select={subject?.active ? subject?.name : null}
                                            onClick={() => {
                                                filterBySubject(subject);
                                            }}>
                                            <Grid display={'flex'} gap={1} alignItems="center">
                                                {subject?.active ? (
                                                    <CheckCircleRoundedIcon sx={{ color: '#FDC300' }} />
                                                ) : (
                                                    <span className="empty-circle" />
                                                )}
                                                {capitalizeFirstLetter(subject?.name)} ({subject?.length})
                                            </Grid>
                                        </CommonButtonGroup>
                                    ))}
                                </Grid>
                            </Grid>

                            <Grid item gap={1} display={'flex'} flexDirection={'column'} className="activity-grid-counts">
                                <Heading3 text="Activity counts" />
                                <CommonButtonGroup
                                    groupBtn={['Hide', 'Show']}
                                    select={showActivityCounts ? 'Show' : 'Hide'}
                                    onClick={() => {
                                        setShowActivityCounts(!showActivityCounts);
                                    }}
                                />
                            </Grid>
                        </Grid>
                    ) : null}
                    <Divider />

                    {isScroll ? (
                        <div className="scroll_button_parent">
                            <div onClick={() => sideScroll(registerTableContianer.current, 25, 100, -10)}>
                                <span className="material-icons arrow">keyboard_arrow_left</span>
                            </div>
                            <div onClick={() => sideScroll(registerTableContianer.current, 25, 100, 10)}>
                                <span className="material-icons arrow">keyboard_arrow_right</span>
                            </div>
                        </div>
                    ) : null}
                    <TableContainer ref={registerTableContianer} className="table-container">
                        {loading ? (
                            <CommonLoading />
                        ) : (
                            <Table className="table-content">
                                {classPupils?.[responseKey]?.classTopics?.length > 0 ? (
                                    <TableHead className="table-head activity-grid-table-header">
                                        <TableRow className="table-row">
                                            <TableCell className="table-cell fiexd-col border_none" />
                                            {(pupilClassTopics || [])
                                                .filter(
                                                    (i) =>
                                                        (i.isReadingTopic && subjects.some((v) => v.name === READING && v.active)) ||
                                                        i.staticTopicSubjects?.some((s) => subjects.some((v) => v.name === s && v.active))
                                                )
                                                .map((topic, ind) => {
                                                    const isOtherClassTopic = getIsOtherClassTopic(topic);

                                                    return (
                                                        <TableCell
                                                            key={ind}
                                                            className={`nested-table-cell ${isOtherClassTopic ? 'other-class-topic' : ''}`}
                                                            onClick={() => {
                                                                if (isOtherClassTopic) return;

                                                                if (topic?.isReadingTopic) {
                                                                    router?.push(
                                                                        `/class/${queryParams?.class_id}/readingweek/${topic?.id}`
                                                                    );
                                                                } else {
                                                                    router?.push(`/class/${queryParams?.class_id}/topic/${topic?.id}`);
                                                                }
                                                            }}>
                                                            <div>
                                                                <Tooltip
                                                                    title={`${showDate({ date: topic?.releaseDate, short: true })}: ${
                                                                        topic?.staticTopicName
                                                                    }${isOtherClassTopic ? ' - This topic has been assigned to the pupil by a different class' : ''}`}>
                                                                    <div
                                                                        className={`rotated-text ${
                                                                            showActivityCounts ? 'bottom-text' : ''
                                                                        }`}>
                                                                        <p>{topic?.staticTopicName}</p>
                                                                        <p
                                                                            className="rotated-releaseDate"
                                                                            data-test="activity-grid-topic-release-date">
                                                                            {!isOtherClassTopic ? (
                                                                                `${showDate({ date: topic.releaseDate, short: true })}`
                                                                            ) : (
                                                                                <div className="for-group">
                                                                                    <Chip
                                                                                        label={topic?.schoolClassName}
                                                                                        className="group-chip"
                                                                                    />
                                                                                    {showDate({
                                                                                        date: topic?.releaseDate,
                                                                                        short: true
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </Tooltip>

                                                                {showActivityCounts && (
                                                                    <p className="text-bottom">
                                                                        {topic?.readingTarget === 0 ? (
                                                                            <Paragraph text={'Holiday'} customClass={'holiday_text'} />
                                                                        ) : (
                                                                            <CommonPopOver
                                                                                hover
                                                                                element={
                                                                                    topic?.isReadingTopic ? (
                                                                                        <div className="calendar">
                                                                                            <span>{topic?.readingTarget}</span>
                                                                                            <ShowCountStatus imageType={`calendar_today`} />
                                                                                        </div>
                                                                                    ) : (
                                                                                        `/${topic?.staticTopicActivitiesCount}`
                                                                                    )
                                                                                }>
                                                                                {topic?.isReadingTopic ? (
                                                                                    <Paragraph
                                                                                        text={`Target of ${
                                                                                            topic?.readingTarget === 1
                                                                                                ? `${topic?.readingTarget} day`
                                                                                                : `${topic?.readingTarget} days`
                                                                                        } this week`}
                                                                                    />
                                                                                ) : (
                                                                                    <Paragraph
                                                                                        text={`${topic?.staticTopicActivitiesCount} activities available`}
                                                                                    />
                                                                                )}
                                                                            </CommonPopOver>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    );
                                                })}
                                        </TableRow>
                                    </TableHead>
                                ) : null}
                                <TableBody className="table-body">
                                    {(classPupils?.[responseKey]?.['pupils'] || []).map((pupil) => {
                                        return (
                                            <TableRow key={pupil?.id} className="table-row extra">
                                                <TableCell
                                                    component="th"
                                                    scope="row"
                                                    className={`table-cell extra-width fiexd-col ${getPupilStatusBorderColor(
                                                        pupil?.pupilStatus
                                                    )}`}>
                                                    <div className="pupil-name-status-container">
                                                        <Link passHref data-test={`activity-grid-pupil-name`} href={`/pupil/${pupil?.id}`}>
                                                            {pupil?.fullname}
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                                {(pupilClassTopics || [])
                                                    .filter(
                                                        (i) =>
                                                            (i.isReadingTopic && subjects.some((v) => v.name === READING && v.active)) ||
                                                            i.staticTopicSubjects?.some((s) =>
                                                                subjects.some((v) => v.name === s && v.active)
                                                            ) ||
                                                            !subjects.length
                                                    )
                                                    .map((classTopic, index) => {
                                                        const pupilTopic = classTopic.pupilTopics?.find((pt) => pt?.pupil_id === pupil?.id);

                                                        if (!pupilTopic)
                                                            return (
                                                                <TableCell
                                                                    key={index}
                                                                    sx={{
                                                                        background: '#F2F2F2'
                                                                    }}
                                                                />
                                                            );

                                                        const icon =
                                                            classTopic?.readingTarget === 0 ? (
                                                                getIconBehalfOnReadingTarget(pupilTopic)
                                                            ) : classTopic?.isReadingTopic ? (
                                                                getIconBehalfOnReadingLogs(pupilTopic)
                                                            ) : pupilTopic?.watchedVideo ? (
                                                                getIconBehalfOnEarnedStars(pupilTopic)
                                                            ) : (
                                                                <span className={`material-icons remove`}>remove</span>
                                                            );

                                                        return (
                                                            <TableCell
                                                                key={index}
                                                                className={`table-cell ${
                                                                    classTopic?.readingTarget === 0 ? 'grey-table-cell' : ''
                                                                }`}>
                                                                <CommonPopOver hover iconClassName={`${icon}_icon_color`} element={icon}>
                                                                    <ShowPupilTopicProgress
                                                                        pupilTopicId={pupilTopic?.id}
                                                                        isReadingTopic={classTopic?.isReadingTopic}
                                                                        key={index}
                                                                    />
                                                                </CommonPopOver>
                                                            </TableCell>
                                                        );
                                                    })}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>
                </>
            )}
        </div>
    );
};

export default ActivityGrid;
