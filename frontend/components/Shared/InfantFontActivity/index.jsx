import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

const useStyles = makeStyles({
    textContainer: {
        fontSize: ({ fontSize }) => (!fontSize ? '16px' : `${fontSize}px`),
        fontFamily: ({ fontType }) => (!fontType ? 'SassoonInfantRg-Regular' : `${fontType}`)
    }
});

const InfantFontActivity = ({ children, fontType, fontSize }) => {
    const classes = useStyles({ fontSize, fontType });

    return <>{children && <p className={classes.textContainer}>{children}</p>}</>;
};

InfantFontActivity.propTypes = {
    children: PropTypes.element,
    fontType: PropTypes.string,
    fontSize: PropTypes.number
};

export default InfantFontActivity;
