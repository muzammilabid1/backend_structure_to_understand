import { Visibility, VisibilityOff } from '@mui/icons-material';
import { FormControl, Grid, IconButton, InputAdornment, InputLabel, OutlinedInput } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

import CommonError from '../CommonError';

const PasswordField = ({
    label,
    value,
    onChange,
    disabled,
    name,
    error,
    autoFocus,
    touched,
    customClass,
    onBlur,
    xs,
    sm,
    md,
    lg,
    dataTest
}) => {
    const [showPassword, setshowPassword] = useState(false);

    return (
        <Grid item xs={xs} sm={sm} md={md} lg={lg}>
            <FormControl classes={{ root: customClass ? `${customClass} root` : 'root' }} variant="outlined">
                <InputLabel htmlFor="outlined-adornment-password">{label}</InputLabel>
                <OutlinedInput
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    autoFocus={autoFocus}
                    onBlur={onBlur}
                    disabled={disabled}
                    name={name}
                    error={error ? true : false}
                    inputProps={dataTest ? { 'data-test': dataTest } : undefined}
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setshowPassword(!showPassword)}
                                onMouseDown={(event) => event.preventDefault()}
                                edge="end"
                                size="large">
                                {showPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </InputAdornment>
                    }
                />
                <CommonError error={error} touched={touched} />
            </FormControl>
        </Grid>
    );
};

PasswordField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    disabled: PropTypes.bool,
    name: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    autoFocus: PropTypes.bool,
    customClass: PropTypes.string,
    xs: PropTypes.number,
    sm: PropTypes.number,
    md: PropTypes.number,
    lg: PropTypes.number,
    dataTest: PropTypes.string
};
PasswordField.defaultProps = {
    xs: 12,
    sm: 12,
    md: 3,
    lg: 3
};

export default PasswordField;
