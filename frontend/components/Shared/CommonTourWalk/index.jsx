import { Backdrop, useMediaQuery, useTheme } from '@mui/material';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

const useStyles = makeStyles((theme) => ({
    typography: {
        padding: theme.spacing(2)
    },
    popover: {
        pointerEvents: 'none'
    },
    paper: {
        overflowX: 'unset',
        overflowY: 'unset',
        borderRadius: '20px',
        marginTop: '20px',
        '&::before': {
            content: '""',
            position: 'absolute',
            marginRight: '-0.71em',
            bottom: 'unset',
            top: '-30px',
            width: 30,
            height: 30,
            right: '50%',
            left: ({ smbp }) => (smbp ? '50%' : '75%'),
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[1],
            transform: `translate(-50%, 50%) rotate(${'-45deg'})`,
            clipPath: 'polygon(-5px -5px, calc(100% + 5px) -5px, calc(100% + 5px) calc(100% + 5px))'
        }
    }
}));

const CommonTourWalk = ({ children, element, className, style, childrenClass, popoverClassName, isOpen = false, paddings = 0 }) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.up('sm'));
    const classes = useStyles({ smbp });

    const [anchorEl, setAnchorEl] = useState(null);
    const divRef = useRef();

    useEffect(() => {
        if (isOpen) {
            if (element instanceof HTMLElement) {
                // If element is a DOM node, use it directly for positioning
                setAnchorEl(element);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (divRef.current) {
                // Otherwise, use the ref
                divRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setAnchorEl(divRef.current);
            }
        } else {
            setAnchorEl(null);
        }
    }, [element, isOpen]);

    const open = Boolean(anchorEl);

    const positioningOptions = {
        anchorOriginVertical: 'bottom',
        anchorOriginHorizontal: 'center',
        transformOriginVertical: 'top',
        transformOriginHorizontal: 'center'
    };

    return (
        <div className={className}>
            <Typography
                className={`common_drop_down`}
                ref={divRef}
                style={open ? { zIndex: 1200, background: '#fff', padding: smbp ? paddings : 0, ...style } : style}></Typography>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => {
                    setAnchorEl(null);
                }}
                className={popoverClassName}
                classes={{ paper: classes.paper }}
                disableRestoreFocus
                anchorOrigin={{ vertical: positioningOptions.anchorOriginVertical, horizontal: positioningOptions.anchorOriginHorizontal }}
                transformOrigin={{
                    vertical: positioningOptions.transformOriginVertical,
                    horizontal: positioningOptions.transformOriginHorizontal
                }}>
                <Typography className={`${classes.typography} ${childrenClass}`}>{children}</Typography>
            </Popover>
            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={open} />
        </div>
    );
};

CommonTourWalk.propTypes = {
    children: PropTypes.element,
    element: PropTypes.any,
    setAnchorEl: PropTypes.element,
    className: PropTypes.string,
    childrenClass: PropTypes.string,
    popoverClassName: PropTypes.string,
    isOpen: PropTypes.bool,
    style: PropTypes.object,
    paddings: PropTypes.number
};

export default CommonTourWalk;
