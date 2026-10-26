import { Card } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';
// will remove component
const PopoverCard = () => {
    return <Card classes={{ root: 'popover-card-container' }}>{/* <CardContent>{children}</CardContent> */}</Card>;
};

PopoverCard.propTypes = { children: PropTypes.element };

export default PopoverCard;
