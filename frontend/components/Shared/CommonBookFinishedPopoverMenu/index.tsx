/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';

function BookHistoryFinishedImage() {
    return <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/book-history-finished.svg`} />;
}

function BookHistoryNotFinishedImage() {
    return <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/book-history-not-finished.svg`} />;
}

export default function CommonBookFinishedPopoverMenu({ className, isBookFinished, pageNumber }: Props) {
    if (true === isBookFinished) {
        return (
            <CommonPopOver hover element={<BookHistoryFinishedImage />}>
                <Grid container gap={1} alignItems={'center'}>
                    <BookHistoryFinishedImage />
                    <b>Finished</b>
                </Grid>
            </CommonPopOver>
        );
    }

    if (false === isBookFinished) {
        return (
            <CommonPopOver hover className={className} element={<BookHistoryNotFinishedImage />}>
                <Grid alignItems={'center'}>
                    <Grid container gap={1} alignItems={'center'} marginBottom={'10px'}>
                        <BookHistoryNotFinishedImage />
                        <b>Not finished</b>
                    </Grid>
                    {null != pageNumber && (
                        <p>
                            Read up to page: <b>{pageNumber}</b>
                        </p>
                    )}
                </Grid>
            </CommonPopOver>
        );
    }

    return null;
}

interface Props {
    className?: string;
    isBookFinished?: boolean | null;
    pageNumber?: string | null;
}
