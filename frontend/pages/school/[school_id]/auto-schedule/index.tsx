import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import ProgrammeBanner from '../../../../components/School/WholeSchoolAutoSchedule/ProgrammeBanner';
import { wholeSchoolAutoScheduleProgrammes } from '../../../../components/School/WholeSchoolAutoSchedule/queries';
import SetATopicHeader, { SetATopicTab } from '../../../../components/School/WholeSchoolAutoSchedule/SetATopicHeader';
import { summariseAssignmentRecord } from '../../../../components/School/WholeSchoolAutoSchedule/wholeSchoolPreview';
import LWPButton from '../../../../components/Shared/Button/LWPButton';
import CommonLoading from '../../../../components/Shared/CommonLoading';
import CommonStatus from '../../../../components/Shared/CommonStatus';
import Heading2 from '../../../../components/Shared/Typography/Heading2';
import Paragraph from '../../../../components/Shared/Typography/Paragraph';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../../shared/Services/handler';
import { IWholeSchoolAutoScheduleProgramme } from '../../../../types/entities/IWholeSchoolSequencePreview';
import { PageType } from '../../../../types/enums/PageType';

const siteImage = (name: string) => `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${name}`;

/**
 * The Auto schedule tab of Set a topic, for school leaders and admins (LEA-6687). This is what makes
 * whole-school auto-scheduling reachable without a URL.
 *
 * One banner per programme the school can schedule, leading to that subject's page. A programme
 * nothing has been published for is not shown at all, so today that is Money Skills alone. Once a
 * programme is scheduled its banner becomes a summary row, whose Review leads to the same page in
 * its already-scheduled state.
 *
 * A failed request gets its own state rather than falling through to "no programmes", which would be
 * a definite claim made on no information.
 */
const AutoScheduleTabPage = () => {
    const router = useRouter();
    const schoolId = useParams()?.school_id as string;
    const { callSnackbar } = useContext(ThemeContext);

    const { data, loading, error } = useQuery(wholeSchoolAutoScheduleProgrammes, {
        variables: { schoolId },
        skip: !schoolId,
        fetchPolicy: 'cache-and-network'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const programmes: IWholeSchoolAutoScheduleProgramme[] = data?.wholeSchoolAutoScheduleProgrammes ?? [];
    const scheduled = programmes.filter((programme) => programme.assignment);
    const notScheduled = programmes.filter((programme) => !programme.assignment);

    const openSubject = (programme: IWholeSchoolAutoScheduleProgramme) =>
        router?.push(`/school/${schoolId}/auto-schedule/${programme.subjectId}`);

    const renderContent = () => {
        if (loading && !data) return <CommonLoading />;

        if (error) {
            return (
                <CommonStatus
                    className="auto-schedule-empty-state"
                    dataTest="set-a-topic-auto-schedule-error-state"
                    image={siteImage('mathscot-thinking.png')}
                    heading="We could not load auto-scheduling for your school"
                    subHeading="Something went wrong at our end. Please refresh the page to try again."
                />
            );
        }

        return (
            <>
                {scheduled.length ? (
                    <Paragraph
                        customClass="auto-schedule-tab-intro"
                        dataTest="set-a-topic-auto-schedule-intro"
                        text="You are able to auto-schedule topics across multiple classes or year groups using this feature."
                    />
                ) : programmes.length ? (
                    <Heading2
                        text="There are currently no programmes auto-scheduled."
                        customClass="auto-schedule-none-scheduled"
                        dataTest="set-a-topic-auto-schedule-none-scheduled"
                    />
                ) : (
                    // A school entitled to no programme would otherwise be left on a page with nothing to do.
                    <Paragraph
                        dataTest="set-a-topic-auto-schedule-nothing-available"
                        text="Your school has no programmes that can be auto-scheduled yet. You can still set topics for each class from the Topic library."
                    />
                )}

                {scheduled.length ? (
                    <div className="sequence-items-table" data-test="set-a-topic-auto-schedule-scheduled-table">
                        {/* On a phone the heading row is hidden and each cell carries its own label instead,
                            because four columns do not fit in the width. */}
                        <Grid container className="sequence-items-table-head" alignItems="center">
                            <Grid item sm={4}>
                                <Paragraph text="Programme" customClass="sequence-items-table-heading" />
                            </Grid>
                            <Grid item sm={3}>
                                <Paragraph text="Year groups" customClass="sequence-items-table-heading" />
                            </Grid>
                            <Grid item sm={3}>
                                <Paragraph text="Scheduled dates" customClass="sequence-items-table-heading" />
                            </Grid>
                        </Grid>

                        {scheduled.map((programme) => {
                            const summary = summariseAssignmentRecord(programme.assignment, (date) => showDate({ date, short: true }));

                            return (
                                <Grid
                                    container
                                    key={programme.subjectId}
                                    alignItems="center"
                                    className="sequence-items-table-row"
                                    data-test={`set-a-topic-auto-schedule-scheduled-row-${programme.subjectId}`}>
                                    <Grid item xs={12} sm={4} data-label="Programme">
                                        <Paragraph text={programme.subjectName} />
                                    </Grid>
                                    <Grid item xs={12} sm={3} data-label="Year groups">
                                        <Paragraph text={summary.yearGroups} />
                                    </Grid>
                                    <Grid item xs={12} sm={3} data-label="Scheduled dates">
                                        <Paragraph text={summary.dates} />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <LWPButton
                                            btnText="Review"
                                            variant="text"
                                            color="inherit"
                                            endIcon="arrow_forward"
                                            dataTest={`set-a-topic-auto-schedule-review-${programme.subjectId}`}
                                            onClick={() => openSubject(programme)}
                                        />
                                    </Grid>
                                </Grid>
                            );
                        })}
                    </div>
                ) : null}

                {notScheduled.map((programme) => (
                    <ProgrammeBanner
                        key={programme.subjectId}
                        programme={programme}
                        text={`Auto-schedule ${programme.subjectName} topics for your school`}
                        dataTest={`set-a-topic-auto-schedule-banner-${programme.subjectId}`}
                        buttonDataTest={`set-a-topic-auto-schedule-banner-button-${programme.subjectId}`}
                        onClick={() => openSubject(programme)}
                    />
                ))}
            </>
        );
    };

    return (
        <div className="auto-schedule-page set-a-topic-auto-schedule" data-test="set-a-topic-auto-schedule">
            <SetATopicHeader schoolId={schoolId} active={SetATopicTab.AutoSchedule} />
            {renderContent()}
        </div>
    );
};

AutoScheduleTabPage.pageType = PageType.SCHOOL_LEADER;
AutoScheduleTabPage.pageTitle = 'School: Auto-schedule';

export default AutoScheduleTabPage;
