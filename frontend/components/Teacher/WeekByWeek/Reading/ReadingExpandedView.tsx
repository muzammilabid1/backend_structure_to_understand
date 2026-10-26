/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { Divider, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { getPupilStatusBorderColor } from '../../../../shared/Services/handler';
import CommonAddPupilInTag from '../../../Shared/CommonAddPupilInTag';
import CommonPopOver from '../../../Shared/CommonPopOver';
import Paragraph from '../../../Shared/Typography/Paragraph';
import PupilReadingHistory from './PupilReadingHistory';
import { HeadItem, Topic } from './ReadingCompactView';

interface ReadingExpandedViewProps {
    classReadingTopic: { readingTarget: number; pupilTopics: Topic[] };
    setBookHistoryModal: (modalState: { open: boolean; name: string; pupilId: string }) => void;
    onEntrieshandler: (topicId: number, pupilId: string, pupilName: string) => void;
    getIconBehalfOnReadingTarget: any;
    getIconBehalfOnReadingLogs: any;
    head: HeadItem[];
    query: any;
    getIcon: (item: HeadItem, feedbacks: any[]) => string | null;
}

const ReadingExpandedView = ({
    classReadingTopic,
    setBookHistoryModal,
    onEntrieshandler,
    getIconBehalfOnReadingTarget,
    getIconBehalfOnReadingLogs,
    head,
    query,
    getIcon
}: ReadingExpandedViewProps) => {
    const router = useRouter();

    return (
        <>
            {classReadingTopic?.pupilTopics?.map((topic) => {
                const icon =
                    classReadingTopic?.readingTarget === 0
                        ? getIconBehalfOnReadingTarget(topic)
                        : classReadingTopic?.readingTarget > 0
                          ? getIconBehalfOnReadingLogs(topic)
                          : '';

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
                                        dataTest="pupil-name-on-week-by-week-reading-view"
                                        text={topic?.pupil.fullname}
                                        onClick={() => {
                                            router?.push(`/pupil/${topic?.pupil?.id}`);
                                        }}
                                    />
                                    <CommonAddPupilInTag
                                        tags={topic?.pupil.tags}
                                        showtype="EXPANDED"
                                        pupilId={topic?.pupil?.id}
                                        schoolId={topic?.pupil?.school?.id}
                                        query={query}
                                        variables={{ classId: router?.query?.class_id, topicId: router?.query?.topicId }}
                                    />
                                </Grid>
                                {icon}
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
                                justifyContent={{ xs: 'space-between', sm: 'space-evenly' }}
                                textAlign={'center'}>
                                {head?.map((item) => {
                                    const icon = getIcon(item, topic?.feedbacks);

                                    return (
                                        <Grid>
                                            {item?.text}
                                            <Grid height={24} mt={1}>
                                                <CommonPopOver
                                                    hover
                                                    element={
                                                        icon && (
                                                            <img
                                                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${icon}`}
                                                                alt={icon}
                                                                width={25}
                                                            />
                                                        )
                                                    }>
                                                    <PupilReadingHistory date={item} topic={topic} />
                                                </CommonPopOver>
                                            </Grid>
                                        </Grid>
                                    );
                                })}
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
                                    onClick={() => onEntrieshandler(topic?.id, topic?.pupil.id, topic?.pupil.fullname)}
                                    data-test="pupil-entries-button">
                                    <span className={`material-icons`}>comment</span>
                                    Entries
                                </Grid>
                                <Grid
                                    className="cp"
                                    display={'flex'}
                                    alignItems={'center'}
                                    gap={1}
                                    onClick={() =>
                                        setBookHistoryModal({ open: true, name: topic?.pupil.fullname, pupilId: topic?.pupil.id })
                                    }>
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/View_book_history_black_icon.svg`}
                                        width={29}
                                    />
                                    Books
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                );
            })}
        </>
    );
};

export default ReadingExpandedView;
