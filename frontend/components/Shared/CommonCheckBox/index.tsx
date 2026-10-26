/* eslint-disable @typescript-eslint/no-explicit-any */
import { Checkbox, FormControlLabel, Grid } from '@mui/material';
import React, { CSSProperties, InputHTMLAttributes, ReactElement } from 'react';

import CommonError from '../CommonError';
import Paragraph from '../Typography/Paragraph';

interface CommonCheckBoxProps {
    onChange?: any;
    onClick?: any;
    checked?: boolean;
    label?: string;
    children?: ReactElement;
    name?: string;
    className?: string;
    customClass?: string;
    disabled?: boolean;
    value?: string | boolean;
    error?: any;
    touched?: any;
    indeterminate?: boolean;
    onBlur?: any;
    labelPlacement?: 'end' | 'start' | 'top' | 'bottom';
    style?: CSSProperties;
    icon?: string;
    color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default';
    checkedIcon?: string;
    xs?: 'auto' | number;
    sm?: 'auto' | number;
    md?: 'auto' | number;
    lg?: 'auto' | number;

    sx?: any;
    dataTest?: string;
    labelDataTest?: string;
    /**
     * Accessible name for the input itself. Needed where the checkbox carries no visible label, or
     * where the reason it is disabled is written somewhere a screen reader will not reach from here
     * (a neighbouring table cell, say).
     */
    ariaLabel?: string;
}

const CommonCheckBox = ({
    onChange,
    onClick,
    checked,
    label,
    children,
    name,
    className,
    disabled,
    value,
    error,
    touched,
    onBlur,
    labelPlacement,
    style,
    icon = 'check_box_outline_blank',
    checkedIcon = 'check_box',
    customClass,
    xs,
    sm,
    md,
    lg,
    sx,
    indeterminate,
    color = 'secondary',
    dataTest,
    labelDataTest,
    ariaLabel
}: CommonCheckBoxProps) => {
    return (
        <>
            <Grid className={`${customClass}`} style={style} xs={xs} sm={sm} md={md} lg={lg} item>
                <FormControlLabel
                    style={style}
                    classes={{ root: 'checkbox-container' }}
                    className={className}
                    disabled={disabled}
                    labelPlacement={labelPlacement}
                    sx={sx}
                    control={
                        <Checkbox
                            onBlur={onBlur}
                            style={{ alignItems: 'flex-start' }}
                            value={value}
                            color={color}
                            checked={checked}
                            onChange={onChange}
                            onClick={onClick}
                            name={name}
                            indeterminate={indeterminate}
                            icon={<span className="material-icons">{icon}</span>}
                            checkedIcon={<span className="material-icons">{checkedIcon}</span>}
                            inputProps={
                                {
                                    'data-test': dataTest,
                                    ...(ariaLabel ? { 'aria-label': ariaLabel } : {})
                                } as InputHTMLAttributes<HTMLInputElement>
                            }
                        />
                    }
                    label={<Paragraph dataTest={labelDataTest}>{label || children}</Paragraph>}
                />

                <CommonError error={error} touched={touched} />
            </Grid>
        </>
    );
};

export default CommonCheckBox;
