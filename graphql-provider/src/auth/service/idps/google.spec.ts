import jwkToPem from 'jwk-to-pem';
import { createJWKSMock } from 'mock-jwks';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

process.env.GOOGLE_CLIENT_ID ||= 'testClientId';

import { validateGoogleJwt } from './google';

describe('Google JWT validator', () => {
    const jwksMock = createJWKSMock('https://www.googleapis.com', '/oauth2/v3/certs');
    const pemsMock = http.get('https://www.googleapis.com/oauth2/v1/certs', async () => {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
        const keys = await res.json();

        return HttpResponse.json({
            [jwksMock.kid()]: jwkToPem(keys['keys'][0])
        });
    });
    const mswServer = setupServer(pemsMock);

    beforeEach(() => {
        mswServer.use(jwksMock.mswHandler);
        mswServer.listen({ onUnhandledRequest: 'bypass' });
    });

    it('should return false for something other than a valid token', async () => {
        expect(await validateGoogleJwt('test')).toBe(false);
    });

    it('should return false for a token with incorrect audience', async () => {
        const access_token = jwksMock.token({
            aud: 'not_the_right_audience',
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300
        });

        expect(await validateGoogleJwt(access_token)).toBe(false);
    });

    it('should return false for a token with no hosted_domain when one is needed', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test2',
            email_verified: true,
            email: 'testeverified@example.com'
        });

        expect(await validateGoogleJwt(access_token, 'google.com')).toBe(false);
    });

    it('should return false for a token with an invalid hosted_domain when one is needed', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test2',
            email_verified: true,
            email: 'testeverified@example.com',
            hd: 'test.com'
        });

        expect(await validateGoogleJwt(access_token, 'google.com')).toBe(false);
    });

    it('should return the id and email for a valid token when hosted_domains match', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test2',
            email_verified: true,
            email: 'testeverified@example.com',
            hd: 'google.com'
        });

        expect(await validateGoogleJwt(access_token, 'google.com')).toEqual({
            id: 'test2',
            email: 'testeverified@example.com'
        });
    });

    it('should return the id and email for a valid token with valid email_verified true', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test2',
            email_verified: true,
            email: 'testeverified@example.com'
        });

        expect(await validateGoogleJwt(access_token)).toEqual({
            id: 'test2',
            email: 'testeverified@example.com'
        });
    });

    it('should return the id alone for a valid token with no email', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test3'
        });

        expect(await validateGoogleJwt(access_token)).toEqual({
            id: 'test3',
            email: null
        });
    });

    it('should return the id alone for a valid token with email but no email_verified', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test4',
            email: 'test4@example.com'
        });

        expect(await validateGoogleJwt(access_token)).toEqual({
            id: 'test4',
            email: null
        });
    });

    it('should return names appropriately', async () => {
        const access_token = jwksMock.token({
            aud: process.env.GOOGLE_CLIENT_ID,
            iss: 'accounts.google.com',
            exp: new Date().getTime() / 1000 + 86300,
            sub: 'test5',
            given_name: 'Testy',
            family_name: 'Tester'
        });

        expect(await validateGoogleJwt(access_token)).toEqual({
            id: 'test5',
            email: null,
            firstName: 'Testy',
            lastName: 'Tester'
        });
    });
});
