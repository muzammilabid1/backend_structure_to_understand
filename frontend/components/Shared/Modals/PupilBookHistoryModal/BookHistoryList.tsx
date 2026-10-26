/* eslint-disable @next/next/no-img-element */
import { Divider, Grid } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS, renderReadingTypeImg } from '../../../../shared/Constant';
import { safeTitleise } from '../../../../shared/utils';
import BookHistoryReadAt from '../../BookHistoryReadAt';
import CommonBookFinishedPopoverMenu from '../../CommonBookFinishedPopoverMenu';

const BookHistoryList = ({ bookHistoryData, pupilId, formikValues }) => {
    return bookHistoryData?.map((item) => {
        const titleizedBookName = safeTitleise(item?.bookName);

        return (
            <>
                <Grid container>
                    <Grid item xs sm md lg display={'flex'} alignItems={'center'} gap={'15px'}>
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${renderReadingTypeImg[item?.readingType]}.svg`}
                            width={50}
                            height={45}
                        />

                        <p>{titleizedBookName}</p>

                        <CommonBookFinishedPopoverMenu isBookFinished={item.isBookFinished} pageNumber={item.pageNumber} />
                    </Grid>
                    <BookHistoryReadAt item={item} pupilId={pupilId} formikValues={formikValues} />
                </Grid>
                <Divider sx={{ margin: '12px 0' }} />
            </>
        );
    });
};

export default BookHistoryList;
