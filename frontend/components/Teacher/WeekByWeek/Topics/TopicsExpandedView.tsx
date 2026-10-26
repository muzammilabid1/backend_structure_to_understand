/* eslint-disable @next/next/no-img-element */
import { Divider, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';

import { getClassTopicForWeekByWeek } from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { getPupilStatusBorderColor } from '../../../../shared/Services/handler';
import { IPupilTopics } from '../../../../types/entities/IGetClassTopicForWeekByWeek';
import { IPupil } from '../../../../types/entities/IPupil';
import CommonAddPupilInTag from '../../../Shared/CommonAddPupilInTag';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface ITopicsExpandedView {
    getPupilTopics: IPupilTopics[];
    onEntrieshandler: (topicId: string, pupilId: string, pupilName: string) => void;
    showScrapbookEntriesButton: boolean;
    scrapbookEntrieshandler: (pupil: IPupil) => void;
}

const TopicsExpandedView = ({
    getPupilTopics,
    onEntrieshandler,
    showScrapbookEntriesButton,
    scrapbookEntrieshandler
}: ITopicsExpandedView) => {
    return (
        <>
            {getPupilTopics?.map((topic) => {
                const earnedStars = topic?.activities.some((x) => x.earnedStar);
                const router = useRouter();

                return (
                    <Grid
                        container
                        border={'1px solid rgba(214, 209, 203, 0.50)'}
                        boxShadow={' 0px 4px 8px 0px rgba(214, 209, 203, 0.50)'}
                        minHeight={100}
                        mb={2}
                        borderRadius={'4px'}
                        py={2}
                        px={3}
                        className={'table-row'}
                        alignItems={'center'}>
                        <Grid container spacing={2} className={`table-row-border ${getPupilStatusBorderColor(topic?.pupil?.pupilStatus)}`}>
                            <Grid item lg={5} md={5} sm={4} xs={12} display={'flex'} alignItems={'center'} justifyContent={'space-between'}>
                                <Grid>
                                    <Paragraph
                                        customClass="cp ul pupil_fullname"
                                        dataTest="week-by-week-expanded-view-pupil-name-list"
                                        text={topic?.pupil.fullname}
                                        onClick={() => {
                                            router?.push(`/pupil/${topic?.pupil?.id}`);
                                        }}
                                    />
                                    <CommonAddPupilInTag
                                        tags={topic?.pupil.tags}
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
                                            width={30}
                                            height={30}
                                        />
                                    ) : (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/watch_video.svg`}
                                            alt={'watch video'}
                                            width={30}
                                            height={30}
                                        />
                                    )
                                ) : null}
                            </Grid>
                            <Grid item>
                                <Divider orientation="vertical" />
                            </Grid>
                            <Grid
                                item
                                lg={5}
                                md={5}
                                sm={5}
                                xs={12}
                                display={'flex'}
                                alignItems={'center'}
                                justifyContent={{ xs: 'space-between', sm: 'space-evenly' }}>
                                <Grid display={'flex'} flexDirection={'column'} alignItems={'center'}>
                                    <Paragraph text={'Video'} />
                                    {topic?.watchedVideo ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/green_tick.svg`}
                                            alt={'task done'}
                                            width={25}
                                            height={25}
                                        />
                                    ) : (
                                        <span className={`material-icons`}>remove</span>
                                    )}
                                </Grid>
                                <Grid>
                                    <Paragraph text={'Activities'} centerText />
                                    <Grid display={'flex'} gap={2}>
                                        {topic?.activities.map((activitie) =>
                                            activitie.earnedStar ? (
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/green_tick.svg`}
                                                    alt={'task done'}
                                                    width={25}
                                                    height={25}
                                                />
                                            ) : (
                                                <span className={`material-icons`}>remove</span>
                                            )
                                        )}
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item>
                                <Divider orientation="vertical" />
                            </Grid>
                            <Grid
                                item
                                lg={1}
                                md={1}
                                sm={1}
                                xs={12}
                                display={'flex'}
                                flexDirection={{ xs: 'row', sm: 'column' }}
                                justifyContent={{ xs: 'space-between', sm: 'center' }}
                                gap={2}>
                                <Grid
                                    className="cp"
                                    display={'flex'}
                                    alignItems={'center'}
                                    gap={1}
                                    onClick={() => onEntrieshandler(topic?.id, topic?.pupil.id, topic?.pupil.fullname)}>
                                    <span className={`material-icons`}>comment</span>
                                    Entries
                                </Grid>
                                {showScrapbookEntriesButton ? (
                                    <Grid
                                        className="cp"
                                        display={'flex'}
                                        alignItems={'center'}
                                        gap={1}
                                        onClick={() => scrapbookEntrieshandler(topic?.pupil)}>
                                        <span className={`material-icons`}>menu_book</span>
                                        Scrapbook
                                    </Grid>
                                ) : null}
                            </Grid>
                        </Grid>
                    </Grid>
                );
            })}
        </>
    );
};

export default TopicsExpandedView;
