import { Add } from '@mui/icons-material';
import { Fab } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

const FabButton = ({ disabled, loading, icon, onClick, variant, size, color, btnText }) => {
    return (
        <Fab color={color} size={size} onClick={onClick} disabled={disabled || loading} variant={variant}>
            {loading ? '...loading' : icon}
            {btnText}
        </Fab>
    );
};

FabButton.propTypes = {
    color: PropTypes.string,
    icon: PropTypes.element,
    variant: PropTypes.string,
    btnText: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    loading: PropTypes.element,
    size: PropTypes.string
};
FabButton.defaultProps = {
    color: 'primary',
    icon: <Add />,
    size: 'small'
};

export default FabButton;
