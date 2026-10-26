/* eslint-disable @next/next/no-img-element */
import { Chip, Grid } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS, renderReadingTypeImg } from '../../../shared/Constant';
import { safeTitleise } from '../../../shared/utils';
import BookHistoryReadAt from '../../Shared/BookHistoryReadAt';
import CommonCard from '../../Shared/Cards/CommonCard';
import Heading3 from '../../Shared/Typography/Heading3';

export type BookHistoryCardItemsProps = {
    pageNumber?: number;
    isBookFinished?: boolean;
    readingType?: string;
    bookName?: string;
    logCount?: number;
    isReadAtHome?: boolean;
    isReadAtSchool?: boolean;
    isReadingWithGroup?: boolean;
};

type BookHistoryCardProps = {
    item: BookHistoryCardItemsProps;
    pupil: {
        pupil: {
            id: string;
        };
    };
};

const BookHistoryCard = ({ item, pupil }: BookHistoryCardProps) => {
    const titleizedBookName = safeTitleise(item?.bookName);
    const logCount = item?.logCount || 0;

    return (
        <Grid item xs={12} sm={6} md={6} lg={4} position={'relative'} className="book_history_card">
            <CommonCard
                sx={{
                    position: 'relative'
                }}
                className="book_history_card_container">
                {(item?.pageNumber || item?.isBookFinished) && (
                    <Chip
                        label={item?.isBookFinished ? 'Finished' : 'Not finished'}
                        sx={{
                            background: item?.isBookFinished ? '#65B32E' : '#FDC300',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            margin: '15px 15px 0 0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            height: '23px'
                        }}
                    />
                )}

                <Grid display={'flex'} justifyContent={'center'} mb={'5px'}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${
                            renderReadingTypeImg[item?.readingType]
                        }.svg`}
                    />
                </Grid>
                <Heading3 text={titleizedBookName} customClass="bookname" />
                <Grid item display={'flex'} width={'100%'} justifyContent={'space-between'} gap={1} alignItems={'center'}>
                    <span className="book_history_read_at">
                        Read at:
                        <BookHistoryReadAt item={item} pupilId={pupil?.pupil?.id} />
                    </span>
                    <span className="book_history_read_count" data-test="book-read-count">
                        Read:{' '}
                        <span className="book_history_read_count_value">
                            {logCount} {logCount === 1 ? 'time' : 'times'}
                        </span>
                    </span>
                </Grid>
            </CommonCard>
        </Grid>
    );
};

export default BookHistoryCard;
