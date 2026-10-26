/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Grid, TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { getPupilStatusBorderColor } from '../../../../shared/Services/handler';
import CommonAddPupilInTag from '../../../Shared/CommonAddPupilInTag';
import CommonPopOver from '../../../Shared/CommonPopOver';
import CommonTable from '../../../Shared/CommonTable';
import Paragraph from '../../../Shared/Typography/Paragraph';
import PupilReadingHistory from './PupilReadingHistory';

type Tag = {
    name: string;
    color: string;
};

type School = {
    id: string;
};

interface Pupil {
    id: string;
    fullname: string;
    pupilStatus: string;
    tags: Tag[];
    school: School;
}

export interface Topic {
    id: number;
    pupil: Pupil;
    feedbacks: any[];
}

export interface HeadItem {
    text: string;
    code?: string;
}

interface ReadingCompactViewProps {
    classReadingTopic: { readingTarget: number; pupilTopics: Topic[] };
    setBookHistoryModal: (modalState: { open: boolean; name: string; pupilId: string }) => void;
    onEntrieshandler: (topicId: number, pupilId: string, pupilName: string) => void;
    getIconBehalfOnReadingTarget: any;
    getIconBehalfOnReadingLogs: any;
    head: HeadItem[];
    query: any;
    getIcon: (item: HeadItem, feedbacks: any[]) => string | null;
}

const ReadingCompactView = ({
    classReadingTopic,
    setBookHistoryModal,
    onEntrieshandler,
    getIconBehalfOnReadingTarget,
    getIconBehalfOnReadingLogs,
    head,
    query,
    getIcon
}: ReadingCompactViewProps) => {
    const router = useRouter();

    const heading = ['Pupil name', ...(head?.map((v: HeadItem) => v.text) || []), ''];

    return (
        <CommonTable head={heading} TableContainerClassName="compact-table-container readingweek-compact-view-table">
            {(classReadingTopic?.pupilTopics || [])?.map((topic) => {
                const icon =
                    classReadingTopic?.readingTarget === 0
                        ? getIconBehalfOnReadingTarget(topic)
                        : classReadingTopic?.readingTarget > 0
                          ? getIconBehalfOnReadingLogs(topic)
                          : '';

                return (
                    <TableRow key={topic.id} className={'table-row'}>
                        <TableCell className={`table-row-border ${getPupilStatusBorderColor(topic?.pupil?.pupilStatus)}`}>
                            <Grid display={'flex'} alignItems={'center'} justifyContent={'space-between'} minWidth={150}>
                                <Grid container gap={1}>
                                    <Paragraph
                                        customClass="cp ul"
                                        text={topic?.pupil.fullname}
                                        dataTest="pupil-name-on-week-by-week-reading-view"
                                        onClick={() => {
                                            router?.push(`/pupil/${topic?.pupil?.id}`);
                                        }}
                                    />
                                    <CommonAddPupilInTag
                                        tags={topic?.pupil.tags}
                                        showtype="COMPACT"
                                        pupilId={topic?.pupil?.id}
                                        schoolId={topic?.pupil?.school?.id}
                                        query={query}
                                        variables={{ classId: router?.query?.class_id, topicId: router?.query?.topicId }}
                                    />
                                </Grid>
                                {icon}
                            </Grid>
                        </TableCell>

                        {head?.map((item) => {
                            const icon = getIcon(item, topic?.feedbacks);

                            return (
                                <TableCell>
                                    <Grid container>
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
                                </TableCell>
                            );
                        })}

                        <TableCell>
                            <Grid display={'flex'} alignItems={'center'} justifyContent={'flex-end'} gap={2}>
                                <Grid
                                    className="cp"
                                    display={'flex'}
                                    alignItems={'center'}
                                    gap={1}
                                    onClick={() => onEntrieshandler(topic?.id, topic?.pupil.id, topic?.pupil.fullname)}>
                                    <span className={`material-icons`}>comment</span>
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
                                </Grid>
                            </Grid>
                        </TableCell>
                    </TableRow>
                );
            })}
        </CommonTable>
    );
};

export default ReadingCompactView;
