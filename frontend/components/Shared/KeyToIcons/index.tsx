/* eslint-disable @next/next/no-img-element */
import { Grid } from '@mui/material';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonPopOver from '../CommonPopOver';
import Paragraph from '../Typography/Paragraph';

interface IconItem {
    icon: string;
    name: string;
}

interface KeyToIconsProps {
    list?: IconItem[];
    expand?: boolean;
    text?: string;
    noicon?: boolean;
    maxHeight?: number;
}

const KeyToIcons = ({ list = [], expand = false, text = 'Key to icons', noicon = false, maxHeight = 176 }: KeyToIconsProps) => {
    return expand ? (
        <Grid display={'flex'} gap={3}>
            {list?.map((item) => (
                <Grid display={'flex'} gap={1} alignItems={'center'}>
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item?.icon}`}
                        alt={item?.icon}
                        width={25}
                    />
                    <p>{item?.name}</p>
                </Grid>
            ))}
        </Grid>
    ) : (
        <CommonPopOver
            hover
            element={
                <Grid container gap={1} borderBottom={'1px dashed'}>
                    <p>{text}</p>
                    {!noicon && (
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/infoIcon.png`}
                            className="img_fit_contain"
                        />
                    )}
                </Grid>
            }>
            <Grid container rowSpacing={1} columnSpacing={3} flexDirection={'column'} maxHeight={maxHeight}>
                {list?.map((item) => (
                    <Grid item display={'flex'} gap={1} maxWidth={300}>
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item?.icon}`}
                            width={25}
                            height={25}
                            alt={item?.name}
                            className="img_fit_contain"
                        />
                        <Paragraph text={item?.name} />
                    </Grid>
                ))}
            </Grid>
        </CommonPopOver>
    );
};

export default KeyToIcons;
