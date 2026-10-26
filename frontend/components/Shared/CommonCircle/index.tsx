import { Box } from '@mui/system';
import React from 'react';

interface CommonCircleProps {
    width?: number | string;
    height?: number | string;
    bg?: string;
}

const CommonCircle = ({ width = 28, height = 28, bg = 'blue' }: CommonCircleProps) => {
    const shapeStyles = { width, height, backgroundColor: bg, display: 'inline-block' };
    const shapeCircleStyles = { borderRadius: '50%' };
    const circle = <Box component="span" sx={{ ...shapeStyles, ...shapeCircleStyles }} />;

    return circle;
};

export default CommonCircle;
