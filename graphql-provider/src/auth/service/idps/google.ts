import { OAuth2Client } from 'google-auth-library';
import { IdpJwtOutput } from 'src/auth/types/IdpJwtOutput';
import { IdpJwtValidator } from 'src/auth/types/IdpJwtValidator';

const client = new OAuth2Client();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export const validateGoogleJwt: IdpJwtValidator = (token: string, hostedDomainCheck?: string): Promise<false | IdpJwtOutput> => {
    return new Promise((res) => {
        client
            .verifyIdToken({
                idToken: token,
                audience: GOOGLE_CLIENT_ID
            })
            .then(
                (ticket) => {
                    const payload = ticket.getPayload();

                    if (hostedDomainCheck && payload['hd'] !== hostedDomainCheck) {
                        return res(false);
                    }

                    return res({
                        id: payload['sub'],
                        firstName: payload['given_name'],
                        lastName: payload['family_name'],
                        email: (payload['email_verified'] && payload['email']) || null
                    });
                },
                () => res(false)
            );
    });
};
