/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { FormControl, FormHelperText, Grid, InputAdornment, InputBaseComponentProps, InputLabel, OutlinedInput } from '@mui/material';
import React, { ReactNode } from 'react';

import CommonError from '../CommonError';
import Paragraph from '../Typography/Paragraph';

// Define the TypeScript interface for the component props
interface InputFieldProps {
    label?: string;
    id?: string;
    value?: string | number;
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>;
    disabled?: boolean;
    normalDisabledCursorIcon?: boolean;
    type?: string;
    multiline?: boolean;
    rows?: number;
    wordCount?: number;
    name?: string;
    error?: any;
    touched?: any;
    customClass?: string;
    textareaBackgroundImage?: string;
    iconPosition?: 'start' | 'end';
    startIcon?: string | React.ReactNode;
    endIcon?: any;
    placeholder?: string;
    className?: string;
    inputComponent?: React.ElementType<InputBaseComponentProps>;
    helperText?: ReactNode;
    onWheel?: React.WheelEventHandler<HTMLDivElement>;
    autoFocus?: boolean;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    onFocus?: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>;
    endIconHandler?: React.MouseEventHandler<HTMLSpanElement>;
    endCommonTooltipIcon?: any;
    startCommonTooltipIcon?: ReactNode;
    inputProps?: InputBaseComponentProps;
    dataTest?: string;
    [x: string]: any;
}

const InputField = ({
    label,
    id,
    value,
    disabled,
    normalDisabledCursorIcon,
    type,
    multiline,
    rows,
    name,
    onChange,
    onWheel,
    error,
    touched,
    onBlur,
    customClass,
    textareaBackgroundImage,
    iconPosition,
    startIcon,
    endIcon,
    endIconHandler,
    placeholder,
    helperText,
    autoFocus,
    xs,
    sm,
    md,
    lg,
    onFocus,
    inputComponent,
    startCommonTooltipIcon,
    endCommonTooltipIcon,
    wordCount,
    inputProps,
    className,
    dataTest,
    ...rest
}: InputFieldProps) => {
    value = value == null ? '' : value;

    if (dataTest) {
        inputProps = {
            'data-test': dataTest,
            ...inputProps
        };
    }

    return (
        <Grid item xs={xs} sm={sm} md={md} lg={lg} classes={{ root: 'root' }}>
            <FormControl
                variant="outlined"
                classes={{ root: `${customClass}` }}
                id={id}
                className={`${
                    disabled && normalDisabledCursorIcon
                        ? 'disabled-edit-field lwp-field-disabled'
                        : disabled && endIcon !== 'edit'
                          ? 'disabled-field lwp-field-disabled'
                          : endIcon === 'edit'
                            ? 'disabled-edit-field lwp-field-disabled'
                            : 'input-field'
                }`}>
                {textareaBackgroundImage && <img src={textareaBackgroundImage} className="text-area-bg" alt="taxt area bg img" />}
                <InputLabel htmlFor="component-outlined">{label}</InputLabel>
                <OutlinedInput
                    label={label}
                    className={className}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    autoFocus={autoFocus}
                    onFocus={onFocus}
                    disabled={disabled}
                    type={type}
                    multiline={multiline}
                    placeholder={placeholder}
                    inputComponent={inputComponent}
                    rows={rows}
                    name={name}
                    onWheel={onWheel}
                    error={error && touched ? true : false}
                    inputProps={inputProps}
                    startAdornment={
                        (startIcon || startCommonTooltipIcon) && (
                            <InputAdornment position={iconPosition}>
                                {startIcon ? (
                                    <span className="material-icons">{startIcon}</span>
                                ) : startCommonTooltipIcon ? (
                                    startCommonTooltipIcon
                                ) : (
                                    ''
                                )}
                            </InputAdornment>
                        )
                    }
                    {...rest}
                    endAdornment={
                        (endIcon || endCommonTooltipIcon || disabled || wordCount || wordCount === 0) && (
                            <InputAdornment position={iconPosition}>
                                {endIcon || disabled ? (
                                    <span
                                        className={`material-icons ${endIconHandler && 'cp'}`}
                                        onClick={endIconHandler}
                                        style={{
                                            color: `${endIcon === 'edit' ? '#00303C' : endIcon === 'lock' || disabled ? '#999591' : ''}`,
                                            cursor: `${endIcon === 'edit' ? 'pointer' : ''}`
                                        }}>
                                        {disabled && endIcon !== 'edit' ? 'lock' : endIcon}
                                    </span>
                                ) : endCommonTooltipIcon && !disabled ? (
                                    endCommonTooltipIcon
                                ) : (wordCount || wordCount === 0) && !inputProps?.maxlength ? (
                                    <p className="input-field-word-count">{wordCount}</p>
                                ) : wordCount || (wordCount === 0 && inputProps?.maxlength) ? (
                                    <p className="input-field-word-limit">
                                        {wordCount}/{inputProps?.maxlength}
                                    </p>
                                ) : (
                                    ''
                                )}
                            </InputAdornment>
                        )
                    }
                />
                {(endCommonTooltipIcon && disabled) || helperText ? (
                    <FormHelperText id="component-error-text">
                        <div className="helperText">
                            <Paragraph>{endCommonTooltipIcon ? endCommonTooltipIcon?.props?.text : helperText}</Paragraph>
                        </div>
                    </FormHelperText>
                ) : null}
            </FormControl>
            <CommonError error={error} touched={touched} />
        </Grid>
    );
};

InputField.defaultProps = {
    xs: 12,
    sm: 12,
    md: 3,
    lg: 3,
    value: '',
    iconPosition: 'start',
    wordCount: null
};

export default InputField;
