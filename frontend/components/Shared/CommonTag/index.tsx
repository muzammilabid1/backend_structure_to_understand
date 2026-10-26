import { Chip, SxProps } from '@mui/material';
import React from 'react';

import { checkContrast } from '../../../shared/Services/handler';

interface TagProps {
    name: string;
    bgColor?: string;
    dataTest?: string;
    textColor?: string;
    contrast?: boolean;
    sx?: SxProps;
}
const CommonTag = ({ name, dataTest, bgColor = '#F5F5F5', textColor = '#FFF', contrast = true, sx, ...props }: TagProps) => {
    const isCheckContrast = checkContrast(bgColor, textColor);

    return (
        <Chip
            key={name}
            label={name}
            data-test={`${name}-${dataTest}`}
            sx={{
                backgroundColor: bgColor,
                borderRadius: '4px',
                color: contrast ? (isCheckContrast ? '#000' : textColor) : textColor,
                fontSize: '14px',
                fontWeight: 700,
                ...sx
            }}
            {...props}
        />
    );
};

export default CommonTag;
