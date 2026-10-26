import { Button, Paper } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { makeStyles } from '@mui/styles';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React from 'react';

const useStyles = makeStyles({
    // wrapper: {
    //     position: 'relative',
    //     margin: '0 auto',
    //     maxWidth: '300px',
    //     width: '100%'
    // },
    buttonProgress: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12
    }
});

const LWPSocialButton = ({ btnText, disabled, loading, onClick, customClass, endIcon, startIcon, iconClass, children, style }) => {
    const classes = useStyles();
    const router = useRouter();

    return (
        <div className={`${router?.query?.token ? 'lwp-social-button-wrapper-signup' : 'lwp-social-button-wrapper'}`}>
            <Paper>
                <Button
                    style={style}
                    className={customClass ? `${customClass} lwp-social-button` : 'lwp-social-button'}
                    onClick={onClick}
                    disabled={disabled || loading}
                    startIcon={startIcon ? <span className={`social-button material-icons ${iconClass}`}>{startIcon}</span> : ''}
                    endIcon={endIcon ? <span className={`social-button material-icons ${iconClass}`}>{endIcon}</span> : ''}>
                    <span className="social-button-text">{children || btnText}</span>
                </Button>
                {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
            </Paper>
        </div>
    );
};

LWPSocialButton.propTypes = {
    customClass: PropTypes.string,
    startIcon: PropTypes.string,
    endIcon: PropTypes.string,
    btnText: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    iconClass: PropTypes.string,
    children: PropTypes.element,
    style: PropTypes.object
};
LWPSocialButton.defaultProps = {
    btnText: 'Button Name'
};
export default LWPSocialButton;
