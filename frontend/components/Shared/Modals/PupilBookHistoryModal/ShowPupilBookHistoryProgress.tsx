import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, showDate, ThemeContext } from '../../../../shared/Services/handler';
import { BookHistoryCardItemsProps } from '../../../PagesContent/BookHistory/BookHistoryCard';
import Paragraph from '../../Typography/Paragraph';

// Queries
const getPupilBookHistory = gql`
    query getPupilBookHistory(
        $pupilId: String!
        $bookName: String!
        $readingType: ReadingType!
        $readAt: String!
        $isCurrentYearOnly: Boolean!
    ) {
        getPupilBookHistory(
            pupilId: $pupilId
            bookName: $bookName
            readingType: $readingType
            readAt: $readAt
            isCurrentYearOnly: $isCurrentYearOnly
        ) {
            result {
                logCreatedAt
                bookReadAt
                userType
                pupilCount
            }
            total
        }
    }
`;

type ShowPupilBookHistoryProgressProps = {
    item: BookHistoryCardItemsProps;
    pupilId: string;
    readAt: string;
    isCurrentYearOnly?: boolean;
};

const ShowPupilBookHistoryProgress = ({ item, pupilId, readAt, isCurrentYearOnly = false }: ShowPupilBookHistoryProgressProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getPupilBookHistoryProgressQuery, { loading, error, data, called }] = useLazyQuery(getPupilBookHistory, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getPupilBookHistoryProgressQuery({
                variables: { pupilId, bookName: item?.bookName, readingType: item?.readingType, readAt, isCurrentYearOnly }
            });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const moreItem = data?.getPupilBookHistory?.total - 3;

    return (
        <>
            <Grid marginBottom={'8px'}>
                <b>
                    Read {readAt === 'GROUP' ? 'in' : 'at'} {readAt === 'GROUP' ? 'group' : readAt === 'HOME' ? 'home' : 'school'}:
                </b>
            </Grid>

            {!loading && called && data ? (
                <>
                    {data.getPupilBookHistory?.result?.map((BookHistory, i) => {
                        const lastItem = data.getPupilBookHistory?.result?.length < i + 2;

                        return (
                            <Grid display={'flex'} gap={1} alignItems={'center'} mb={lastItem ? (moreItem > 0 ? '16px' : '') : '16px'}>
                                {showDate({ date: BookHistory?.bookReadAt })}
                            </Grid>
                        );
                    })}

                    {moreItem > 0 ? <Paragraph text={`+${moreItem} more`} customClass="book_history_more" /> : null}
                </>
            ) : (
                <Grid container justifyContent={'center'}>
                    <CircularProgress />
                </Grid>
            )}
        </>
    );
};

export default ShowPupilBookHistoryProgress;
