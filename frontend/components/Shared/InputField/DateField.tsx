/* eslint-disable @typescript-eslint/no-explicit-any */
import { Grid } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import React from 'react';

import CommonError from '../CommonError';

interface DateFieldProps {
    disabled?: boolean;
    disablePast?: boolean;
    disableFuture?: boolean;
    xs?: 'auto' | number | boolean;
    sm?: 'auto' | number | boolean;
    md?: 'auto' | number | boolean;
    lg?: 'auto' | number | boolean;
    label?: string;
    onChange: (event: { target: { value: unknown; name?: string } }) => void;
    value: unknown;
    minDate?: string | Date;
    maxDate?: string | Date;
    touched?: any;
    error?: any;
    isGridRoot?: boolean;
    name?: string;
    views?: Array<'day' | 'month' | 'year'>;
    inputFormat?: string;
    className?: string;
    dataTest?: string;
    // endCommonTooltipIcon?: ReactNode;
    [x: string]: unknown;
}

const DateField = ({
    disabled,
    disablePast,
    xs = 12,
    sm = 12,
    md = 3,
    lg = 3,
    label,
    minDate,
    value,
    onChange,
    error,
    touched,
    name,
    views,
    inputFormat = 'dd/MM/yyyy',
    isGridRoot,
    // endCommonTooltipIcon,
    disableFuture,
    maxDate,
    className,
    dataTest,
    ...rest
}: DateFieldProps) => {
    return (
        <Grid item classes={isGridRoot ? { root: 'root' } : {}} xs={xs} sm={sm} md={md} lg={lg}>
            <DatePicker
                className={`${disabled ? 'disabled-field lwp-field-disabled' : 'date-picker-field'} ${touched && error ? 'date-picker-error' : ''} ${className}`}
                views={views}
                label={label}
                value={value}
                name={name}
                minDate={minDate}
                maxDate={maxDate}
                format={inputFormat}
                disabled={disabled}
                disablePast={disablePast}
                disableFuture={disableFuture}
                onChange={(date) => {
                    onChange({
                        target: { value: date, name }
                    });
                }}
                // InputProps={{
                //     endAdornment: <InputAdornment position={iconPosition}>{endCommonTooltipIcon}</InputAdornment>
                // }}
                slotProps={{
                    textField: {
                        inputProps: {
                            'data-test': dataTest
                        }
                    }
                }}
                {...rest}
            />
            <CommonError error={error} touched={touched} />
        </Grid>
    );
};

export default DateField;
