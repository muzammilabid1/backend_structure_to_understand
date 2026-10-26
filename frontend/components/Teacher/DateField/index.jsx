import { Grid, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

const DateField = ({ customClass, disabled, disablePast, xs, sm, md, lg }) => {
    const [selectedDate, handleDateChange] = useState(new Date());

    return (
        <Grid item xs={xs ? xs : 12} sm={sm ? sm : 12} md={md ? md : 3} lg={lg ? lg : 3}>
            <DatePicker
                classes={{ root: customClass ? `${customClass} root` : 'root' }}
                clearable
                value={selectedDate}
                label="Start date"
                placeholder="Start date"
                onChange={(date) => handleDateChange(date)}
                minDate={new Date()}
                format="dd/MM/yyyy"
                // autoOk
                variant="dialog"
                inputVariant="outlined"
                InputAdornmentProps={{
                    position: 'start',
                    className: 'input-icon-date'
                }}
                disabled={disabled}
                disablePast={disablePast}
                renderInput={(props) => <TextField {...props} />}
            />
        </Grid>
    );
};

DateField.propTypes = {
    customClass: PropTypes.string,
    disabled: PropTypes.bool,
    disablePast: PropTypes.bool,
    xs: PropTypes.string,
    sm: PropTypes.string,
    md: PropTypes.string,
    lg: PropTypes.string
};

export default DateField;
