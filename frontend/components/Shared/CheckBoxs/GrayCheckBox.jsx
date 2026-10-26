import { Checkbox, FormControlLabel } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import React from 'react';

import Paragraph from '../Typography/Paragraph';

const GrayCheckbox = withStyles({
    root: {
        color: '#00303C',
        '&$checked': {
            color: '#00303C'
        }
    },
    checked: {}
})((props) => <Checkbox color="inherit" {...props} />);

const GrayCheckBox = ({ name, bool, label, customClass, onChange, onClick, classes, value }) => (
    <FormControlLabel
        className={customClass}
        label={<Paragraph text={label} />}
        control={<GrayCheckbox classes={classes} checked={bool} value={value} onChange={onChange} onClick={onClick} name={name} />}
    />
);

GrayCheckBox.propTypes = {
    name: PropTypes.string,
    onChange: PropTypes.func,
    onClick: PropTypes.func,
    bool: PropTypes.bool,
    label: PropTypes.string,
    customClass: PropTypes.string,
    classes: PropTypes.string,
    value: PropTypes.string
};

export default GrayCheckBox;
