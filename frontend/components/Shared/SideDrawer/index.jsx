import { SwipeableDrawer } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

const SideDrawer = ({ open, onClose, onOpen, children, minWidth, padding }) => {
    return (
        <SwipeableDrawer
            anchor="right"
            open={Boolean(open)}
            onClose={onClose}
            onOpen={onOpen}
            className="drawer-container"
            transitionDuration={600}
            SlideProps={{ style: { minWidth: minWidth, padding: padding } }}>
            {children}
        </SwipeableDrawer>
    );
};

SideDrawer.propTypes = {
    open: PropTypes.any.isRequired,
    onClose: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired,
    children: PropTypes.element.isRequired,
    minWidth: PropTypes.string,
    padding: PropTypes.string
};

export default SideDrawer;
