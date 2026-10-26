import jwt, { GetPublicKeyOrSecret } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { IdpJwtOutput } from 'src/auth/types/IdpJwtOutput';
import { IdpJwtValidator } from 'src/auth/types/IdpJwtValidator';

export const MS_DISCOVERY_KEYS_BASE = 'https://login.microsoftonline.com/';
export const MS_DISCOVERY_KEYS_PATH = 'common/discovery/v2.0/keys';
const MS_CLIENT_ID = process.env.MS_CLIENT_ID;

export const validateMicrosoftJwt: IdpJwtValidator = (token: string, issuer?: string): Promise<false | IdpJwtOutput> => {
    return new Promise((res) => {
        jwt.verify(
            token,
            getSigningKeys,
            {
                audience: MS_CLIENT_ID,
                issuer
            },
            (err, payload) => {
                if (err) {
                    return res(false);
                }

                return res({
                    id: payload['oid'],
                    firstName: payload['given_name'] ?? payload['name'] ?? 'Unknown name',
                    lastName: payload['family_name'] ?? '',
                    email: (['1', 'true'].includes(payload['xms_edov']?.toString()) && payload['email']) || null
                });
            }
        );
    });
};

const getSigningKeys: GetPublicKeyOrSecret = (header, callback): void => {
    const client = jwksClient({
        jwksUri: MS_DISCOVERY_KEYS_BASE + MS_DISCOVERY_KEYS_PATH
    });

    client.getSigningKey(header.kid, function (err, key) {
        const signingKey = key.getPublicKey();

        callback(null, signingKey);
    });
};
