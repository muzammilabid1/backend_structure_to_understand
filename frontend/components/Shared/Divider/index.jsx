import PropTypes from 'prop-types';
import React from 'react';

const Divider = ({ customClass }) => {
    return <hr className={`divider ${customClass}`} />;
};

Divider.propTypes = { customClass: PropTypes.string };

export default Divider;
