/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { BookHistoryCardItemsProps } from '../../PagesContent/BookHistory/BookHistoryCard';
import CommonPopOver from '../CommonPopOver';
import ShowPupilBookHistoryProgress from '../Modals/PupilBookHistoryModal/ShowPupilBookHistoryProgress';

type BookHistoryReadAtProps = {
    item: BookHistoryCardItemsProps;
    pupilId: string;
    formikValues?: {
        isCurrentYearOnly?: boolean;
    };
};

const BookHistoryReadAt = ({ item, pupilId, formikValues = null }: BookHistoryReadAtProps) => {
    const itemData = [
        { condition: item?.isReadAtHome, icon: 'readingHomeIcon.svg', readAt: 'HOME' },
        { condition: item?.isReadAtSchool, icon: 'readingSchoolIcon.svg', readAt: 'SCHOOL' },
        { condition: item?.isReadingWithGroup, icon: 'team_teacher.svg', readAt: 'GROUP' }
    ];

    return (
        <Grid display="flex" alignItems="center" gap={1}>
            {itemData?.map(
                (readingType, index) =>
                    readingType.condition && (
                        <CommonPopOver
                            hover
                            key={index}
                            element={
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${readingType.icon}`}
                                    width={25}
                                />
                            }>
                            <ShowPupilBookHistoryProgress
                                item={item}
                                pupilId={pupilId}
                                readAt={readingType?.readAt}
                                isCurrentYearOnly={formikValues?.isCurrentYearOnly}
                            />
                        </CommonPopOver>
                    )
            )}
        </Grid>
    );
};

export default BookHistoryReadAt;
