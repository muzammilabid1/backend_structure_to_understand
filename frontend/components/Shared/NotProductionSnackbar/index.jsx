import { Snackbar } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import CommonIconButton from '../Button/CommonIconButton';

const NotProductionSnackbar = ({ message, setOpenNotProductionIndicator, openNotProductionIndicator }) => {
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenNotProductionIndicator(false);
    };

    const action = (
        <React.Fragment>
            <CommonIconButton toolTipTitle="Close" onClick={handleClose} icon="close" />
        </React.Fragment>
    );

    return (
        <div className="server-snackbar">
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                open={openNotProductionIndicator}
                message={message}
                action={action}
                key={message}
            />
        </div>
    );
};

NotProductionSnackbar.propTypes = {
    message: PropTypes.string.isRequired,
    setOpenNotProductionIndicator: PropTypes.func,
    openNotProductionIndicator: PropTypes.bool
};

export default NotProductionSnackbar;
