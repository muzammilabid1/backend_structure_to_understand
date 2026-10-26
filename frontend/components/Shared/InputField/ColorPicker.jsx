import { FormControl, FormHelperText, Grid, InputLabel, OutlinedInput } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import CommonError from './../CommonError';

const ColorPicker = ({
    label,
    value,
    disabled,
    name,
    onChange,
    error,
    touched,
    onBlur,
    customClass,
    placeholder,
    helperText,
    autoFocus,
    xs,
    sm,
    md,
    lg,
    onFocus,
    inputComponent
}) => {
    value = value == null ? '' : value;

    return (
        <Grid item xs={xs} sm={sm} md={md} lg={lg} classes={{ root: 'root' }}>
            <FormControl
                variant="outlined"
                classes={{ root: `${customClass} ${disabled ? 'disabled-field lwp-field-disabled' : 'input-field'}` }}>
                <InputLabel htmlFor="component-outlined">{label}</InputLabel>
                <div className="color_picker">
                    <OutlinedInput
                        label={label}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        autoFocus={autoFocus}
                        onFocus={onFocus}
                        disabled={disabled}
                        type={'text'}
                        placeholder={placeholder}
                        inputComponent={inputComponent}
                        name={name}
                        error={error && touched ? true : false}
                    />
                    <input type={'color'} onChange={onChange} value={value} name={name} />
                </div>
            </FormControl>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
            <CommonError error={error} touched={touched} />
        </Grid>
    );
};

ColorPicker.propTypes = {
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    type: PropTypes.string,
    multiline: PropTypes.bool,
    rows: PropTypes.number,
    name: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    customClass: PropTypes.string,
    textareaBackgroundImage: PropTypes.string,
    iconPosition: PropTypes.string,
    image: PropTypes.string,
    placeholder: PropTypes.string,
    inputComponent: PropTypes.string,
    helperText: PropTypes.object,
    autoFocus: PropTypes.bool,
    xs: PropTypes.number,
    sm: PropTypes.number,
    md: PropTypes.number,
    lg: PropTypes.number,
    onFocus: PropTypes.func
};
ColorPicker.defaultProps = {
    xs: 12,
    sm: 12,
    md: 3,
    lg: 3,
    value: '',
    iconPosition: 'start'
};

export default ColorPicker;
