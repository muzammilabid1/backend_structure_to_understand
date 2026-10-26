/* eslint-disable @next/next/no-img-element */
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';
import Carousel from 'react-material-ui-carousel';

const useStyles = makeStyles({
    imgContainer: {
        width: ({ w }) => w ?? '80%',
        height: ({ h }) => h ?? '300px'
    },
    img: {
        maxWidth: ({ w }) => w ?? '80%',
        maxHeight: ({ h }) => h ?? '300px'
    }
});

const CommonImageCarousel = ({ array, height, width }) => {
    const classes = useStyles({ w: width, h: height });

    return (
        <Carousel
            className="react_material"
            navButtonsAlwaysVisible={true}
            navButtonsProps={{
                className: 'custom_button'
            }}
            height={height ? parseInt(height) : 300}
            autoPlay={false}
            animation="slide"
            NextIcon={<span className="material-icons">navigate_next</span>}
            PrevIcon={<span className="material-icons">navigate_before</span>}>
            {array.map((item, i) => (
                <div key={i} className={`image-carousel-container ${classes.imgContainer}`}>
                    <img className={`${classes.img}`} src={item?.imageUrl} alt={`image ${i + 1}: ${item?.alt}`} />
                </div>
            ))}
        </Carousel>
    );
};

CommonImageCarousel.propTypes = { array: PropTypes.array.isRequired, height: PropTypes.string, width: PropTypes.string };

export default CommonImageCarousel;
