import PropTypes from 'prop-types';
import React from 'react';

const CommonDot = ({ color }) => <span className="common_dot" style={{ backgroundColor: color, marginRight: 8 }} />;

CommonDot.propTypes = {
    color: PropTypes.string
};

export default CommonDot;
