import { Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import React from 'react';

import Heading3 from '../Typography/Heading3';
import DialogWrapper from './../DialogWrapper';
import Paragraph from './../Typography/Paragraph';

interface CommonSnackbarProps {
    type?: 'error' | 'info' | 'success' | 'warning';
    autoHideDuration?: number;
    message?: string;
    open: boolean;
    onClose: () => void;
    vertical?: 'top' | 'bottom';
    horizontal?: 'center' | 'left' | 'right';
    primaryBtnText?: string;
    heading?: string;
    showSnackbar?: boolean;
    className?: string;
}

const CommonSnackbar = ({
    type = 'success',
    autoHideDuration = 3000,
    message = '',
    open,
    onClose,
    vertical = 'top',
    horizontal = 'center',
    primaryBtnText = 'Dismiss',
    heading = '',
    showSnackbar = false,
    className
}: CommonSnackbarProps) => {
    if (message === 'Unexpected error') return null;

    return type === 'error' && !showSnackbar ? (
        <DialogWrapper
            className={`error_dialog ${className}`}
            dialogFooter
            primaryBtnText={primaryBtnText}
            primaryBtnHandler={onClose}
            open={open}>
            <Heading3 text={heading} />
            <Paragraph text={message} />
        </DialogWrapper>
    ) : (
        <Snackbar open={open} autoHideDuration={autoHideDuration} onClose={onClose} anchorOrigin={{ vertical, horizontal }}>
            <Alert onClose={onClose} severity={type}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default CommonSnackbar;
