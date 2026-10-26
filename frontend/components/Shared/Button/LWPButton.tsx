/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { makeStyles } from '@mui/styles';
import React, { CSSProperties, ReactNode } from 'react';

const useStyles = makeStyles({
    wrapper: {
        position: 'relative'
    },
    buttonProgress: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12
    }
});

interface LWPButtonProps {
    btnText?: string;
    id?: string;
    disabled?: boolean;
    loading?: boolean;
    onClick?: any;
    customClass?: string;
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    endIcon?: React.ReactElement | string;
    startIcon?: React.ReactElement | string;
    disableRipple?: boolean;
    type?: 'button' | 'submit' | 'reset';
    iconClass?: string;
    children?: ReactNode;
    dataCy?: string;
    style?: CSSProperties;
    href?: string;
    sx?: object;
    dataTest?: string;
}

const LWPButton = ({
    btnText = 'Button Name',
    disabled,
    loading,
    onClick,
    customClass,
    size = 'large',
    fullWidth,
    variant = 'contained',
    color = 'primary',
    endIcon,
    startIcon,
    disableRipple,
    type = 'button',
    iconClass,
    children,
    dataCy,
    style,
    href,
    sx,
    dataTest,
    id
}: LWPButtonProps) => {
    const classes = useStyles();

    return (
        <span className={`${classes.wrapper} lwp-button-wrapper ${disabled && 'lwp-button-disabled'}`}>
            <Button
                style={style}
                id={id}
                data-cy={dataCy}
                size={size}
                className={customClass ? `${customClass} lwp-button` : 'lwp-button'}
                variant={variant}
                color={color}
                fullWidth={fullWidth}
                onClick={onClick}
                disabled={disabled || loading}
                type={type}
                href={href}
                startIcon={startIcon ? <span className={`material-icons ${iconClass}`}>{startIcon}</span> : ''}
                endIcon={endIcon ? <span className={`material-icons ${iconClass}`}>{endIcon}</span> : ''}
                disableRipple={disableRipple}
                data-test={dataTest}
                sx={sx}>
                {children || btnText}
            </Button>
            {loading && <CircularProgress data-test="lwp-button-loading" size={24} className={classes.buttonProgress} />}
        </span>
    );
};

export default LWPButton;
