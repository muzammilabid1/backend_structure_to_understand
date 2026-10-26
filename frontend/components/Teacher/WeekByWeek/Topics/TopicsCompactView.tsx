/* eslint-disable @next/next/no-img-element */
import { Grid, TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';

import { getClassTopicForWeekByWeek } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { getPupilStatusBorderColor } from '../../../../shared/Services/handler';
import { IPupilTopics } from '../../../../types/entities/IGetClassTopicForWeekByWeek';
import { IPupil } from '../../../../types/entities/IPupil';
import CommonAddPupilInTag from '../../../Shared/CommonAddPupilInTag';
import CommonTable from '../../../Shared/CommonTable';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface TopicsCompactViewProps {
    getPupilTopics: IPupilTopics[];
    onEntrieshandler: (pupilTopicId: string, pupilId: string, pupilFullname: string) => void;
    showScrapbookEntriesButton: boolean;
    scrapbookEntrieshandler: (pupil: IPupil) => void;
}

const TopicsCompactView = ({
    getPupilTopics,
    onEntrieshandler,
    showScrapbookEntriesButton,
    scrapbookEntrieshandler
}: TopicsCompactViewProps) => {
    const router = useRouter();

    const heading = ['Pupil name', 'Video', 'Activities', ''];

    return (
        <CommonTable head={heading} className="compact-table" TableContainerClassName="compact-table-container">
            {(getPupilTopics || [])?.map((topic) => {
                const earnedStars = topic?.activities.some((x) => x.earnedStar);

                return (
                    <TableRow key={topic.id} className={'table-row'}>
                        <TableCell className={`table-row-border ${getPupilStatusBorderColor(topic?.pupil?.pupilStatus)}`}>
                            <Grid display={'flex'} alignItems={'center'} justifyContent={'space-between'} minWidth={150}>
                                <Grid container gap={1}>
                                    <Paragraph
                                        customClass="cp ul"
                                        text={topic?.pupil.fullname}
                                        onClick={() => {
                                            router?.push(`/pupil/${topic?.pupil?.id}`);
                                        }}
                                    />
                                    <CommonAddPupilInTag
                                        tags={topic?.pupil.tags}
                                        showtype="COMPACT"
                                        pupilId={topic?.pupil?.id}
                                        schoolId={topic?.pupil?.school?.id}
                                        query={getClassTopicForWeekByWeek}
                                        variables={{ classId: router?.query?.class_id, topicId: router?.query?.topicId }}
                                    />
                                </Grid>

                                {topic?.watchedVideo ? (
                                    earnedStars ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/complete_task.svg`}
                                            alt={'complete task'}
                                            width={24}
                                            height={24}
                                        />
                                    ) : (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/watch_video.svg`}
                                            alt={'watch video'}
                                            width={24}
                                            height={24}
                                        />
                                    )
                                ) : null}
                            </Grid>
                        </TableCell>
                        <TableCell>
                            {topic?.watchedVideo ? (
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/green_tick.svg`}
                                    alt={'task done'}
                                    width={25}
                                    height={18}
                                />
                            ) : (
                                <span className={`material-icons`}>remove</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <Grid display={'flex'} gap={2}>
                                {topic?.activities.map((activitie) =>
                                    activitie.earnedStar ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/green_tick.svg`}
                                            alt={'task done'}
                                            width={25}
                                            height={18}
                                        />
                                    ) : (
                                        <span className={`material-icons`}>remove</span>
                                    )
                                )}
                            </Grid>
                        </TableCell>
                        <TableCell align="right">
                            <Grid display={'flex'} alignItems={'center'} justifyContent={'flex-end'} gap={2}>
                                <Grid
                                    className="cp"
                                    display={'flex'}
                                    alignItems={'center'}
                                    gap={1}
                                    onClick={() => onEntrieshandler(topic?.id, topic?.pupil.id, topic?.pupil.fullname)}>
                                    <span className={`material-icons`}>comment</span>
                                </Grid>
                                {showScrapbookEntriesButton && (
                                    <Grid
                                        className="cp mb1"
                                        display={'flex'}
                                        alignItems={'center'}
                                        gap={1}
                                        onClick={() => scrapbookEntrieshandler(topic?.pupil)}>
                                        <span className={`material-icons`}>menu_book</span>
                                    </Grid>
                                )}
                            </Grid>
                        </TableCell>
                    </TableRow>
                );
            })}
        </CommonTable>
    );
};

export default TopicsCompactView;
