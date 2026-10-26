import { useMediaQuery } from '@mui/material';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { makeStyles } from '@mui/styles';
import { useTheme } from '@mui/system';
import PropTypes from 'prop-types';
import React from 'react';

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
        '&::before': {
            content: '""',
            position: 'absolute',
            marginRight: '-0.71em',
            bottom: (below) => (below ? '0' : 'unset'),
            top: (below) => (below ? 'unset' : '-30px'),
            width: 30,
            height: 30,
            right: '50%',
            left: '50%',
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[1],
            transform: (below) => `translate(-50%, 50%) rotate(${below ? '135deg' : '-45deg'})`,
            clipPath: 'polygon(-5px -5px, calc(100% + 5px) -5px, calc(100% + 5px) calc(100% + 5px))'
        }
    }
}));

const AudioPermissionModal = ({ children, element, className, style, childrenClass, popoverClassName, anchorEl, setAnchorEl }) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('sm'));

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;

    const tester = document.getElementById(id);
    const below = tester ? tester.getBoundingClientRect().top > (smbp ? 350 : 400) : undefined;

    const positioningOptions = below
        ? {
              anchorOriginVertical: 'top',
              anchorOriginHorizontal: 'center',
              transformOriginVertical: 'bottom',
              transformOriginHorizontal: 'center'
          }
        : {
              anchorOriginVertical: 'bottom',
              anchorOriginHorizontal: 'center',
              transformOriginVertical: 'top',
              transformOriginHorizontal: 'center'
          };

    const classes = useStyles(below);

    return (
        <div className={className}>
            <Typography aria-describedby={id} id={'simple-popover'} aria-haspopup="true" className={`common_drop_down`} style={style}>
                {element}
            </Typography>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={() => {
                    setAnchorEl(null);
                }}
                className={`common-popover ${popoverClassName}`}
                classes={{ paper: classes.paper }}
                style={{ marginTop: below ? '-40px' : '40px' }}
                disableRestoreFocus
                anchorOrigin={{ vertical: positioningOptions.anchorOriginVertical, horizontal: positioningOptions.anchorOriginHorizontal }}
                transformOrigin={{
                    vertical: positioningOptions.transformOriginVertical,
                    horizontal: positioningOptions.transformOriginHorizontal
                }}>
                <Typography className={`${classes.typography} ${childrenClass}`}>{children}</Typography>
            </Popover>
        </div>
    );
};

AudioPermissionModal.propTypes = {
    children: PropTypes.element,
    element: PropTypes.element,
    setAnchorEl: PropTypes.element,
    anchorEl: PropTypes.element,
    className: PropTypes.string,
    childrenClass: PropTypes.string,
    popoverClassName: PropTypes.string,
    style: PropTypes.object
};

export default AudioPermissionModal;
