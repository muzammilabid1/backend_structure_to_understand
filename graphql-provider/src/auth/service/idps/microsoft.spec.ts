import createJWKSMock from 'mock-jwks';

process.env.MS_CLIENT_ID ||= 'testClientId';

import { MS_DISCOVERY_KEYS_BASE, MS_DISCOVERY_KEYS_PATH, validateMicrosoftJwt } from './microsoft';

describe('Microsoft JWT validator', () => {
    const jwksMock = createJWKSMock(MS_DISCOVERY_KEYS_BASE, MS_DISCOVERY_KEYS_PATH);

    beforeEach(() => jwksMock.start());

    it('should return false for something other than a valid token', async () => {
        expect(await validateMicrosoftJwt('test')).toBe(false);
    });

    it('should return false for a token with incorrect audience', async () => {
        const access_token = jwksMock.token({
            aud: 'not_the_right_audience',
            iss: 'master'
        });

        expect(await validateMicrosoftJwt(access_token)).toBe(false);
    });

    it('should return false for a token with incorrect issuer when specified', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test',
            xms_edov: 1,
            email: 'testedov1@example.com'
        });

        expect(await validateMicrosoftJwt(access_token, 'notTheSameIssuer')).toBe(false);
    });

    it('should return normally for a valid token with correct issuer when specified', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test',
            xms_edov: 1,
            email: 'testedov1@example.com'
        });

        expect(await validateMicrosoftJwt(access_token, 'master')).toEqual({
            id: 'test',
            email: 'testedov1@example.com',
            firstName: 'Unknown name',
            lastName: ''
        });
    });

    it('should return the id and email for a valid token with valid edov 1', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test',
            xms_edov: 1,
            email: 'testedov1@example.com'
        });

        expect(await validateMicrosoftJwt(access_token)).toEqual({
            id: 'test',
            email: 'testedov1@example.com',
            firstName: 'Unknown name',
            lastName: ''
        });
    });

    it('should return the id and email for a valid token with valid edov true', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test2',
            xms_edov: true,
            email: 'testedov2@example.com'
        });

        expect(await validateMicrosoftJwt(access_token)).toEqual({
            id: 'test2',
            email: 'testedov2@example.com',
            firstName: 'Unknown name',
            lastName: ''
        });
    });

    it('should return the id alone for a valid token with no email', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test3'
        });

        expect(await validateMicrosoftJwt(access_token)).toEqual({
            id: 'test3',
            email: null,
            firstName: 'Unknown name',
            lastName: ''
        });
    });

    it('should return the id alone for a valid token with email but no edov', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test4',
            email: 'test4@example.com'
        });

        expect(await validateMicrosoftJwt(access_token)).toEqual({
            id: 'test4',
            firstName: 'Unknown name',
            lastName: '',
            email: null
        });
    });

    it('should return names appropriately', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test5',
            given_name: 'Testy',
            family_name: 'Tester'
        });

        expect(await validateMicrosoftJwt(access_token)).toEqual({
            id: 'test5',
            email: null,
            firstName: 'Testy',
            lastName: 'Tester'
        });
    });

    it('should return full name as first name if no more specific name claim made', async () => {
        const access_token = jwksMock.token({
            aud: process.env.MS_CLIENT_ID,
            iss: 'master',
            oid: 'test5',
            name: 'Testy Tester'
        });

        expect(await validateMicrosoftJwt(access_token)).toEqual({
            id: 'test5',
            email: null,
            firstName: 'Testy Tester',
            lastName: ''
        });
    });
});
