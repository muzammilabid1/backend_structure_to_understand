import { Container } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

const CommonContainer = ({ children, className }) => (
    <Container className={className} disableGutters={true} classes={{ root: 'layout-container' }} maxWidth={false}>
        {children}
    </Container>
);

CommonContainer.propTypes = {
    children: PropTypes.element.isRequired,
    className: PropTypes.string
};

export default CommonContainer;
