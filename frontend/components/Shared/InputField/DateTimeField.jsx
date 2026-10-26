import { DateTimePicker } from '@mui/lab';
import { Grid, TextField } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

const DateTimeField = ({
    customClass,
    disabled,
    disablePast,
    xs,
    sm,
    md,
    lg,
    label,
    minDate,
    value,
    onChange,
    onBlur,
    error,
    touched,
    name
}) => {
    return (
        <Grid item xs={xs ? xs : 12} sm={sm ? sm : 12} md={md ? md : 3} lg={lg ? lg : 3}>
            <DateTimePicker
                classes={{ root: customClass ? `${customClass} root` : 'root' }}
                label={label}
                value={value}
                name={name}
                onBlur={onBlur}
                minDate={minDate}
                inputFormat="dd/MM/yyyy HH:mm"
                disabled={disabled}
                disablePast={disablePast}
                onChange={(date) => {
                    onChange({
                        target: { value: date, name }
                    });
                }}
                InputAdornmentProps={{
                    position: 'start',
                    className: 'input-icon-date'
                }}
                helperText={touched && error && `${error}`}
                renderInput={(props) => <TextField {...props} />}
            />
        </Grid>
    );
};

DateTimeField.propTypes = {
    customClass: PropTypes.string,
    disabled: PropTypes.bool,
    disablePast: PropTypes.bool,
    xs: PropTypes.string,
    sm: PropTypes.string,
    md: PropTypes.string,
    lg: PropTypes.string,
    label: PropTypes.string,
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    value: PropTypes.string,
    minDate: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    name: PropTypes.string
};

export default DateTimeField;
