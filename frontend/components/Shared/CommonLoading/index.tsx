import CircularProgress from '@mui/material/CircularProgress';
import { makeStyles } from '@mui/styles';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import CommonStatus from '../CommonStatus';
import Heading1 from '../Typography/Heading1';

const useStyles = makeStyles({
    loadingarea: {
        height: '50vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    },
    loading_failed_status: {
        maxWidth: '260px',
        marginTop: '10rem'
    },
    tryLoading: {
        maxWidth: '260px'
    }
});

interface CommonLoadingProps {
    className?: string;
}

const CommonLoading = ({ className = '' }: CommonLoadingProps) => {
    const classes = useStyles();
    const { message } = useContext(ThemeContext);
    const router = useRouter();
    const [state, setState] = useState(false);
    const [tryReload, setTryReload] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setState(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    const tryToReload = () => {
        setTryReload(true);

        setTimeout(() => {
            router?.reload();
        }, 1000);
    };

    return (
        <div className={`common_loading ${className} ${classes.loadingarea}`}>
            {message !== 'Unexpected error' ? (
                <>
                    <CircularProgress data-test="common-loading" />
                    <Heading1 text="Loading" centerText />
                    {state && (
                        <CommonStatus
                            buttonText={'Reload page'}
                            className={classes.tryLoading}
                            onClick={() => tryToReload()}
                            subHeading={`This seems to be taking a long time. 
                                   
                                   You could try reloading the page using the button below.`}
                        />
                    )}
                </>
            ) : (
                <>
                    {tryReload && <CircularProgress data-test="common-loading" className={classes.loading_failed_status} />}
                    <CommonStatus
                        buttonText={'Refresh page'}
                        className={tryReload ? classes.tryLoading : classes.loading_failed_status}
                        heading={`Loading failed`}
                        onClick={() => tryToReload()}
                        subHeading={'Something went wrong. Please refresh the page and try again.'}
                    />
                </>
            )}
        </div>
    );
};

export default CommonLoading;
