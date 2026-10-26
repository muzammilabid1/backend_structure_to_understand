import MuiAlert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import React, { ReactNode, useState } from 'react';

import { getCookie, setCookie } from '../../../lib/manageCookies';

interface SnackbarProps {
    children: ReactNode;
    className?: string;
    icon?: string;
    cookie: string;
    iconClassName?: string;
    setSnackBarClose?: (value: boolean) => void;
    snackBarClose?: boolean;
}

const Snackbar = ({ children, className, icon, cookie, iconClassName, setSnackBarClose, snackBarClose }: SnackbarProps) => {
    const [close, setClose] = useState(false);

    const key = getCookie(cookie);

    const onClick = (cookie) => {
        if (setSnackBarClose) {
            setSnackBarClose(!snackBarClose);
        } else {
            setClose(true);
        }

        const Minutes = new Date(new Date().getTime() + 10 * 60 * 1000);

        setCookie(cookie, cookie, { expires: Minutes });
    };

    return (
        <>
            {key === cookie || close ? null : (
                <span className="snackbar">
                    <MuiAlert
                        className={className}
                        action={
                            <Button onClick={() => onClick(cookie)} color="inherit" size="small">
                                <span className="material-icons">clear</span>
                            </Button>
                        }
                        icon={<span className={`material-icons icon_color ${iconClassName}`}>{icon}</span>}>
                        {children}
                    </MuiAlert>
                </span>
            )}
        </>
    );
};

export default Snackbar;
