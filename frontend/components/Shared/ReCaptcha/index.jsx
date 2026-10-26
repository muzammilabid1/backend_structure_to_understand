import { Turnstile } from '@marsidev/react-turnstile';
import CircularProgress from '@mui/material/CircularProgress';
import PropTypes from 'prop-types';
import React, { forwardRef, Fragment, useEffect, useState } from 'react';

// eslint-disable-next-line react/display-name
const CommonReCaptcha = forwardRef(
    (
        {
            siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || 'none',
            className = '',
            action,
            callSnackbar,
            onSuccess,
            onBecomeInvalid
        },
        ref
    ) => {
        const [loaded, setLoaded] = useState(false);
        const [timeoutReset, setTimeoutReset] = useState(() => () => {});

        useEffect(() => {
            if (siteKey === 'none') {
                onSuccess();
            } else if (!loaded) {
                const timer = setTimeout(() => {
                    console.log('Turnstile not loaded within 3s');
                    callSnackbar(
                        "Looks like we've not been able to load Cloudflare Turnstile, the service we use to check you're a human. Please check your network connection, or try disabling any browser extensions that block network requests.",
                        'error',
                        "We couldn't load our robot checker",
                        true
                    );
                }, 3000);

                setTimeoutReset(() => () => clearTimeout(timer));

                return () => clearTimeout(timer);
            }
        }, []);

        return siteKey !== 'none' ? (
            <div className={className}>
                <div className={loaded ? '' : 'hidden'}>
                    <Turnstile
                        siteKey={siteKey}
                        style={{ marginLeft: 'auto', marginRight: 'auto' }}
                        ref={ref}
                        options={{ action, size: 'normal', theme: 'light' }}
                        onError={(code) => {
                            callSnackbar(
                                `Looks like we're having trouble verifying you're human (error code ${code}). Please try again.`,
                                'warning'
                            );
                        }}
                        onSuccess={onSuccess}
                        onExpire={onBecomeInvalid}
                        onUnsupported={() => {
                            callSnackbar(
                                "Your browser doesn't seem to be supported. Please upgrade your browser to the latest version and try again.",
                                'error'
                            );
                        }}
                        onWidgetLoad={() => {
                            timeoutReset();
                            onBecomeInvalid();
                            setLoaded(true);
                        }}
                    />
                </div>
                {loaded ? '' : <CircularProgress />}
            </div>
        ) : (
            <Fragment />
        );
    }
);

CommonReCaptcha.propTypes = {
    onError: PropTypes.func,
    siteKey: PropTypes.string.isRequired,
    className: PropTypes.string,
    action: PropTypes.string,
    callSnackbar: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    onBecomeInvalid: PropTypes.func
};

export default CommonReCaptcha;
