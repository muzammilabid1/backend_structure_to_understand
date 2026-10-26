import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';

interface CommonIconButtonProps {
    onClick: () => void;
    icon: string;
    className?: string;
    dataTest?: string;
    toolTipTitle?: string;
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    id?: string;
}

const CommonIconButton = ({
    onClick,
    icon,
    dataTest,
    className = '',
    disabled = false,
    toolTipTitle,
    size = 'large',
    id = ''
}: CommonIconButtonProps) =>
    toolTipTitle ? (
        <Tooltip title={toolTipTitle}>
            <IconButton id={id} data-test={dataTest} onClick={onClick} aria-label="icon" disabled={disabled} size={size}>
                <span className={`material-icons ${className}`}>{icon}</span>
            </IconButton>
        </Tooltip>
    ) : (
        <IconButton id={id} data-test={dataTest} onClick={onClick} aria-label="icon" disabled={disabled} size={size}>
            <span className={`material-icons ${className}`}>{icon}</span>
        </IconButton>
    );

export default CommonIconButton;
