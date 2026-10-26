/* eslint-disable @next/next/no-img-element */
import { Card, CardMedia, Grid } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import Heading3 from '../Typography/Heading3';

const SimpleChildCard = ({ childImg, childName, cardHandler, dataTest }) => {
    return (
        <Grid item sm={6} md={6} lg={3} classes={{ root: 'grid-card' }}>
            <Card classes={{ root: `simple-child-card-container` }} onClick={cardHandler} data-test={dataTest}>
                <CardMedia classes={{ root: 'simple-child-card-bg' }}>
                    <img src={childImg} alt="Child thumbnail" className="simple-child-image" />
                    <center>
                        <Heading3 text={childName} centerText />
                    </center>
                </CardMedia>
            </Card>
        </Grid>
    );
};

SimpleChildCard.propTypes = {
    childImg: PropTypes.string,
    childName: PropTypes.string,
    cardHandler: PropTypes.func,
    dataTest: PropTypes.string
};

export default SimpleChildCard;
