import { createHmac } from 'crypto';
import jwt, { type Algorithm, type SignOptions } from 'jsonwebtoken';
import { tokenIsAdminToken } from './token';

// random token, not used anywhere real ever
const TEST_LWP_JWT_SECRET =
    '+NNH7kqHzmxUQL4aGi8/5/3lq6GFI1Um4Cpa1axcovClQNqpERJjPode2b2ntIHo ';

const ADMIN_CLAIMS = {
    tokenType: 0,
    firstName: 'Test',
    lastName: 'User',
    userType: 'ADMIN',
    status: 'ACTIVE',
    adminRestrictions: null,
    isSchoolLeader: false,
    email: 'testuser@example.com',
    phoneNumber: null,
    userTrustLevel: 2,
    sub: 'testusersub',
};

type MakeTokenOptions = {
    expiresIn?: string | null;
    algorithm?: Algorithm;
    secret?: string;
};

const makeToken = (
    content: Object,
    {
        expiresIn = '12h',
        algorithm = 'HS256',
        secret = TEST_LWP_JWT_SECRET,
    }: MakeTokenOptions = {},
): string => {
    const signOptions: SignOptions =
        expiresIn === null ? { algorithm } : { algorithm, expiresIn };

    return jwt.sign(content, secret, signOptions);
};

const encodeSegment: (value: Object) => string = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

const forgeToken: (claims: Object) => string = (claims) => {
    const body = `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment(claims)}`;
    const signature = createHmac('sha256', TEST_LWP_JWT_SECRET)
        .update(body)
        .digest('base64url');

    return `${body}.${signature}`;
};

const forgeUnsignedToken: (claims: Object) => string = (claims) =>
    `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment(claims)}.`;

const anHourFromNow = () => Math.floor(Date.now() / 1000) + 3600;

describe('token.ts', () => {
    beforeEach(
        () => (process.env.LWP_JWT_SECRET = TEST_LWP_JWT_SECRET.trimEnd()),
    );

    it('returns true on a valid token as generated', async () => {
        await expect(tokenIsAdminToken(makeToken(ADMIN_CLAIMS))).resolves.toBe(
            true,
        );
    });

    it('returns false on a token missing the admin claims', async () => {
        await expect(
            tokenIsAdminToken(makeToken({ invalid: 1 })),
        ).resolves.toBe(false);
    });

    it('returns false on a token with no expiry', async () => {
        await expect(
            tokenIsAdminToken(makeToken(ADMIN_CLAIMS, { expiresIn: null })),
        ).resolves.toBe(false);
    });

    it('returns false on an expired token', async () => {
        await expect(
            tokenIsAdminToken(makeToken(ADMIN_CLAIMS, { expiresIn: '-1h' })),
        ).resolves.toBe(false);
    });

    it('returns false on a token that is not fully-trusted', async () => {
        await expect(
            tokenIsAdminToken(
                makeToken({ ...ADMIN_CLAIMS, userTrustLevel: 1 }),
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a token that is not an auth token', async () => {
        await expect(
            tokenIsAdminToken(makeToken({ ...ADMIN_CLAIMS, tokenType: 1 })),
        ).resolves.toBe(false);
    });

    it('returns false on a token that is not an admin token', async () => {
        await expect(
            tokenIsAdminToken(makeToken({ ...ADMIN_CLAIMS, userType: 'USER' })),
        ).resolves.toBe(false);
    });

    it('returns false on a token that is not active', async () => {
        await expect(
            tokenIsAdminToken(
                makeToken({ ...ADMIN_CLAIMS, status: 'INVITED' }),
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a static valid token that will have expired', async () => {
        await expect(
            tokenIsAdminToken(
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlblR5cGUiOjAsImZpcnN0TmFtZSI6IlRlc3QiLCJsYXN0TmFtZSI6IlVzZXIiLCJ1c2VyVHlwZSI6IkFETUlOIiwic3RhdHVzIjoiQUNUSVZFIiwiYWRtaW5SZXN0cmljdGlvbnMiOm51bGwsImlzU2Nob29sTGVhZGVyIjpmYWxzZSwiZW1haWwiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsInBob25lTnVtYmVyIjpudWxsLCJ1c2VyVHJ1c3RMZXZlbCI6MiwiaWF0IjoxNzg3MjI1OTQ0LCJleHAiOjE3ODcyMjYyNDQsInN1YiI6InRlc3R1c2VyIn0.MaBpyXozBswlM8MJPBc7n2RJI5g8GkkxOmPcYMu1usU',
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a token signed with HS384', async () => {
        await expect(
            tokenIsAdminToken(makeToken(ADMIN_CLAIMS, { algorithm: 'HS384' })),
        ).resolves.toBe(false);
    });

    it('returns false on a token signed with HS512', async () => {
        await expect(
            tokenIsAdminToken(makeToken(ADMIN_CLAIMS, { algorithm: 'HS512' })),
        ).resolves.toBe(false);
    });

    it('returns false on an unsigned token claiming the none algorithm', async () => {
        await expect(
            tokenIsAdminToken(
                forgeUnsignedToken({ ...ADMIN_CLAIMS, exp: anHourFromNow() }),
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a token signed with a different secret', async () => {
        await expect(
            tokenIsAdminToken(
                makeToken(ADMIN_CLAIMS, { secret: 'a-different-secret ' }),
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a token signed without the trailing space', async () => {
        await expect(
            tokenIsAdminToken(
                makeToken(ADMIN_CLAIMS, {
                    secret: TEST_LWP_JWT_SECRET.trimEnd(),
                }),
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a token whose payload is not an object', async () => {
        await expect(
            tokenIsAdminToken(makeToken('not an object', { expiresIn: null })),
        ).resolves.toBe(false);
    });

    it('returns false on a token whose exp is a numeric string', async () => {
        await expect(
            tokenIsAdminToken(
                forgeToken({ ...ADMIN_CLAIMS, exp: String(anHourFromNow()) }),
            ),
        ).resolves.toBe(false);
    });

    it('returns false on a token whose exp is not a number at all', async () => {
        await expect(
            tokenIsAdminToken(forgeToken({ ...ADMIN_CLAIMS, exp: 'tomorrow' })),
        ).resolves.toBe(false);
    });

    it('returns false on an empty string', async () => {
        await expect(tokenIsAdminToken('')).resolves.toBe(false);
    });

    it('returns false on a string that is not a token at all', async () => {
        await expect(tokenIsAdminToken('garbage')).resolves.toBe(false);
    });

    it('returns false on a token with no signature segment', async () => {
        await expect(tokenIsAdminToken('a.b')).resolves.toBe(false);
    });

    it('returns false when LWP_JWT_SECRET is unset', async () => {
        const token = makeToken(ADMIN_CLAIMS);
        delete process.env.LWP_JWT_SECRET;

        await expect(tokenIsAdminToken(token)).resolves.toBe(false);
    });

    it('returns false when LWP_JWT_SECRET is empty', async () => {
        const token = makeToken(ADMIN_CLAIMS);
        process.env.LWP_JWT_SECRET = '';

        await expect(tokenIsAdminToken(token)).resolves.toBe(false);
    });
});
