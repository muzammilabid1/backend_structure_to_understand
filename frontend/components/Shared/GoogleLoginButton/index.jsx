import PropTypes from 'prop-types';
import React, { useEffect } from 'react';

/**
 * Based originally on code from
 * https://github.com/JamesAlexanderHill/react-sign-in-with-google
 */

const GoogleLoginButton = ({
    buttonId = 'gsiButtonDiv',
    clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    callback = (args) => console.log('handleGoogleSignIn', { args }),
    initOptions = {},
    styleOptions = { theme: 'outline', size: 'large', width: 275, logo_alignment: 'center' },
    promptOneTap = false, // Optionally display the One Tap dialog
    clickListener = () => {}
}) => {
    useEffect(function onmount() {
        const initGsi = () => {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback,
                ...initOptions
            });

            window.google.accounts.id.renderButton(document.getElementById(buttonId), {
                ...styleOptions,
                click_listener: clickListener
            });
            if (!promptOneTap) return;
            window.google.accounts.id.prompt();
        };

        const script = document.createElement('script');

        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = initGsi;
        script.async = true;
        script.id = 'google-identity-services-client-script';
        document.querySelector('body')?.appendChild(script);

        return function unmount() {
            window.google?.accounts.id.cancel();
            document.getElementById('google-identity-services-client-script')?.remove();
        };
    }, []);

    return <div id={buttonId}></div>;
};

GoogleLoginButton.propTypes = {
    buttonId: PropTypes.string,
    clientId: PropTypes.string,
    callback: PropTypes.func,
    clickListener: PropTypes.func,
    initOptions: PropTypes.object,
    styleOptions: PropTypes.object,
    promptOneTap: PropTypes.bool
};

export default GoogleLoginButton;
