import { createHmac } from 'crypto';
import { jwtDecode } from 'jwt-decode';

import { ACCESS_TOKEN_COOKIE, admin, adminpassword, baseUrl, lwpSchoolName, REFRESH_TOKEN_COOKIE } from '../../shared/constants';
import { loginPage } from '../../shared/pages/login';

describe('Token Validation', () => {
    // eslint-disable-next-line no-undef
    beforeEach(() => {
        cy.visit(`${baseUrl}`);
    });

    it('should auto-renew the access token after it expires when logged in with email and password', () => {
        loginPage.login(admin, adminpassword);

        cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
            // Token expired 5 minutes ago
            const expireTime = Math.floor(Date.now() / 1000) - 500;

            const signedToken = encodeJwt(cookie.value, expireTime);

            cy.setCookie(ACCESS_TOKEN_COOKIE, signedToken);
            cy.get(`.sidebar-options-list`).contains('Schools').click();
            cy.get('[data-testid="school-details-link"]').contains(lwpSchoolName).click();
        });
    });

    it('Refresh token expiry to 30 days when "remember me" is checked', () => {
        loginPage.login(admin, adminpassword, true);

        cy.getCookie(REFRESH_TOKEN_COOKIE).then((cookie) => {
            const decoded = jwtDecode(cookie.value);
            const expectedExpireTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days in seconds
            const delta = 300;

            expect(decoded.exp).to.be.closeTo(expectedExpireTime, delta, 'Invalid token expire time');
        });
    });

    it('should log out after both access and refresh tokens expire when logged in with email and password', () => {
        loginPage.login(admin, adminpassword);

        cy.getCookie(ACCESS_TOKEN_COOKIE).then((cookie) => {
            // Token expired 5 minutes ago
            const expireTime = Math.floor(Date.now() / 1000) - 500;

            const signedToken = encodeJwt(cookie.value, expireTime);

            cy.setCookie(ACCESS_TOKEN_COOKIE, signedToken);
        });

        cy.getCookie(REFRESH_TOKEN_COOKIE).then((cookie) => {
            // Token expired 1 hour
            const expireTime = Math.floor(Date.now() / 1000) - 3600;

            const signedToken = encodeJwt(cookie.value, expireTime);

            cy.setCookie(REFRESH_TOKEN_COOKIE, signedToken);
        });

        cy.get(`.sidebar-options-list`).contains('Schools').click();
        cy.get('.heading-one').contains('Log in');
    });
});

/**
 * @param {string} token
 * @param {number} expireTime
 */
function encodeJwt(token, expireTime) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const secret = Cypress.env('LWP_JWT_SECRET');

    const decoded = jwtDecode(token);

    if (typeof decoded === 'object' && decoded !== null && secret) {
        decoded.exp = expireTime;
        const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const encodedPayload = btoa(JSON.stringify(decoded)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const signature = createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64');

        return `${encodedHeader}.${encodedPayload}.${signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
    } else {
        throw new Error('Invalid token payload');
    }
}
