import { Badge } from '@mui/material';
import React from 'react';

interface CommonBadgeProps {
    children?: React.ReactNode;
    badgeContent?: string | number;
    className?: string;
}

const CommonBadge = ({ children, badgeContent, className }: CommonBadgeProps) => {
    return (
        <Badge
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left'
            }}
            className={`badge-color ${className}`}
            badgeContent={badgeContent}
            color="primary">
            {children}
        </Badge>
    );
};

export default CommonBadge;
