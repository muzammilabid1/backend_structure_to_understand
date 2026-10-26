/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, Grid } from '@mui/material';
import React, { MouseEvent, ReactNode } from 'react';
interface CommonCardProps {
    children: ReactNode;
    xs?: 'auto' | number;
    sm?: 'auto' | number;
    md?: 'auto' | number;
    lg?: 'auto' | number;
    className?: string;
    cardClassName?: string;
    cardContentClassName?: string;
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
    background?: string;
    sx?: any;
    csx?: any;
}

const CommonCard = ({
    children,
    xs = 12,
    sm = 12,
    md = 12,
    lg = 12,
    className = '',
    cardClassName = '',
    cardContentClassName = '',
    onClick,
    background = '#fff',
    sx = {},
    csx = {}
}: CommonCardProps) => (
    <Grid item sx={sx} xs={xs} sm={sm} md={md} lg={lg} className={className}>
        <Card className={`common_card ${cardClassName}`} sx={csx} style={{ background }} onClick={onClick}>
            <CardContent className={cardContentClassName}>{children}</CardContent>
        </Card>
    </Grid>
);

export default CommonCard;
