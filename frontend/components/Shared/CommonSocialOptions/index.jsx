import { Stack } from '@mui/material';
import { usePathname } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import GoogleLoginButton from '../GoogleLoginButton';
import MicrosoftLoginButton from '../MicrosoftLoginButton';
import Heading1 from '../Typography/Heading1';

const CommonSocialOptions = ({ microsoft = false, google = false, expectedEmail, callback }) => {
    const pathname = usePathname();
    const { callSnackbar } = useContext(ThemeContext);

    const handleGoogleResponse = (args) => {
        console.log(args);
        callback('Google', args.credential);
    };

    const handleMicrosoftResponse = (err, data) => {
        if (err) {
            callSnackbar(err, 'error');

            return;
        }

        let token = data?.idToken;

        if (window?.Cypress) token = 'testing';

        callback('Microsoft', token);
    };
    const handleClickListner = () => {
        if (window?.Cypress) {
            callback('Google', 'testing');
        }
    };

    if (!microsoft && !google) return null;

    return (
        <div className="social-options-btn-container">
            <br />
            {pathname === '/signup/[token]' ? <Heading1 customClass={'social-options-btn-heading'} text={'or continue with'} /> : null}
            <Stack spacing={3} justifyContent="center" alignItems="center">
                {google ? (
                    <GoogleLoginButton
                        callback={handleGoogleResponse}
                        clickListener={handleClickListner}
                        // initOptions={{ login_hint: expectedEmail }}
                    />
                ) : null}
                {microsoft ? <MicrosoftLoginButton callback={handleMicrosoftResponse} loginHint={expectedEmail} /> : null}
            </Stack>
            <br />
        </div>
    );
};

CommonSocialOptions.propTypes = {
    microsoft: PropTypes.bool.isRequired,
    google: PropTypes.bool.isRequired,
    hasEmail: PropTypes.bool.isRequired,
    expectedEmail: PropTypes.string,
    callback: PropTypes.func.isRequired
};

export default CommonSocialOptions;
