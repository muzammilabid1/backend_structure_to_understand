import { FormControlLabel, Switch } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import CommonError from '../CommonError';
import Paragraph from '../Typography/Paragraph';

const CommonSwitch = ({
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
    size,
    style,
    dataTest
}) => {
    return (
        <>
            <FormControlLabel
                style={style}
                classes={{ root: 'switch-container' }}
                className={className}
                disabled={disabled}
                labelPlacement={labelPlacement}
                control={
                    <Switch
                        onBlur={onBlur}
                        size={size}
                        value={value}
                        color="primary"
                        checked={checked}
                        onChange={onChange}
                        onClick={onClick}
                        name={name}
                        inputProps={dataTest ? { 'data-test': dataTest } : undefined}
                    />
                }
                label={<Paragraph>{label || children}</Paragraph>}
            />

            <CommonError error={error} touched={touched} />
        </>
    );
};

CommonSwitch.propTypes = {
    onChange: PropTypes.func,
    onClick: PropTypes.func,
    checked: PropTypes.bool,
    label: PropTypes.string,
    children: PropTypes.element,
    name: PropTypes.string,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    value: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    onBlur: PropTypes.func,
    labelPlacement: PropTypes.string,
    size: PropTypes.string,
    style: PropTypes.object,
    dataTest: PropTypes.string
};

CommonSwitch.defaultProps = {};

export default CommonSwitch;
