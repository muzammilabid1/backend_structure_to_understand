import PropTypes from 'prop-types';
import React from 'react';

import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';

const MainHeading = ({ heading, text, centerText }) => {
    return (
        <>
            <Heading1 text={heading} centerText={centerText} />
            <Paragraph text={text} centerText={centerText} />
        </>
    );
};

MainHeading.propTypes = {
    heading: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    centerText: PropTypes.bool
};

export default MainHeading;
