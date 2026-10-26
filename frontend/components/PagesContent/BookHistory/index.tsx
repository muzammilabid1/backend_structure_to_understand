/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery } from '@apollo/client';
import { Grid, List, ListItem, ListItemButton, ListItemText, useMediaQuery, useTheme } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonLazyLoading from '../../Shared/CommonLazyLoading';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonStatus from '../../Shared/CommonStatus';
import KeyToIcons from '../../Shared/KeyToIcons';
import BookHistoryCard, { BookHistoryCardItemsProps } from './BookHistoryCard';
const getPupilBookHistoryForParent = gql`
    query getPupilBookHistoryForParent($input: PupilBookHistoryForParentInput!) {
        getPupilBookHistoryForParent(input: $input) {
            total
            limit
            offset
            page_total
            currentAcademicYearSummary {
                distinctBooks
            }
            results {
                bookName
                readingType
                isReadAtHome
                isReadAtSchool
                isReadingWithGroup
                isBookFinished
                pageNumber
                logCount
            }
        }
    }
`;

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
    }
];

const PupilBookHistoryFilter = {
    All: 'All',
    Finished: 'FINISHED',
    'Not finished': 'NOT_FINISHED'
};

type BookHistoryProps = {
    pupil: {
        pupil: {
            id: string;
        };
    };
};

const BookHistory = ({ pupil }: BookHistoryProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('md'));

    const [bookHistoryData, setBookHistoryData] = useState<BookHistoryCardItemsProps[]>([]);
    const [bookHistoryFilter, setbookHistoryFilter] = useState('All');

    const [pupilBookHistoryMutation, { loading, error, data }] = useLazyQuery(getPupilBookHistoryForParent);

    useEffect(() => {
        if (pupil) getPupilBookHistoryData(pupil?.pupil?.id, bookHistoryFilter, 0);
    }, [pupil?.pupil?.id]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const getPupilBookHistoryData = (id: string, type = 'All', offset: number = 0) => {
        if (offset === 0) setBookHistoryData([]);
        setbookHistoryFilter(type);
        pupilBookHistoryMutation({
            variables: {
                input: {
                    pupilId: id,
                    type: PupilBookHistoryFilter[type],
                    limit: 12,
                    offset: offset
                }
            }
        }).then((result) => {
            const newData = (result?.data?.getPupilBookHistoryForParent?.results || []) as BookHistoryCardItemsProps[];

            if (offset === 0) {
                return setBookHistoryData(newData);
            }

            setBookHistoryData((currentData) => [...currentData, ...newData]);
        });
    };

    const currentAcademicYearSummary = data?.getPupilBookHistoryForParent?.currentAcademicYearSummary;

    return (
        <div className="book_history_container">
            <div className="book_history_books_logged">
                <span className="book_history_books_logged_label">Books logged this year</span>
                <span className="book_history_books_logged_value">
                    <span data-test="books-logged-count">{currentAcademicYearSummary?.distinctBooks ?? 0}</span>
                </span>
                <img src="/assets/images/BookHistory.svg" alt="" className="book_history_books_logged_icon" />
            </div>

            <Grid container marginBottom={'24px'} justifyContent={'space-between'} alignItems={'center'}>
                <KeyToIcons list={keyToIcons} expand={!smbp} />
                <CommonPopOver
                    bold
                    icon="expand_more"
                    element={
                        <p>
                            <b>Filter by</b> {bookHistoryFilter}
                        </p>
                    }>
                    <List>
                        {['All', 'Finished', 'Not finished'].map((item) => {
                            return (
                                <ListItem disablePadding key={item}>
                                    <ListItemButton onClick={() => getPupilBookHistoryData(pupil?.pupil?.id, item, 0)}>
                                        <ListItemText primary={item} />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </CommonPopOver>
            </Grid>
            <CommonLazyLoading
                fetchMore={() => getPupilBookHistoryData(pupil?.pupil?.id, bookHistoryFilter, bookHistoryData?.length)}
                previousDataLength={bookHistoryData?.length}
                hasMoreLoading={data?.getPupilBookHistoryForParent?.total !== bookHistoryData?.length}
                loadingContent={<CommonLoading />}>
                <Grid container rowSpacing={3} columnSpacing={2}>
                    {bookHistoryData?.map((item) => (
                        <BookHistoryCard key={`${item?.bookName}-${item?.readingType}`} item={item} pupil={pupil} />
                    ))}
                </Grid>
            </CommonLazyLoading>
            {!loading && !bookHistoryData?.length && (
                <Grid mt={10}>
                    <CommonStatus
                        className="no_feed"
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        heading={'Nothing to show here'}
                    />
                </Grid>
            )}
        </div>
    );
};

export default BookHistory;
