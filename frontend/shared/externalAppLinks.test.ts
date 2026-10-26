import { describe, expect, it } from 'vitest';

import { toSpmDashboardUrl } from './externalAppLinks';

describe('toSpmDashboardUrl', () => {
    it('puts the dashboard on the spm subdomain of the production cookie domain', () => {
        expect(toSpmDashboardUrl('learningwithparents.com')).toBe('https://spm.learningwithparents.com/dashboard');
    });

    it('keeps the staging label, so the host stays inside the staging cookie domain', () => {
        expect(toSpmDashboardUrl('staging.learningwithparents.com')).toBe('https://spm.staging.learningwithparents.com/dashboard');
    });

    it('keeps the dev label too', () => {
        expect(toSpmDashboardUrl('dev.learningwithparents.com')).toBe('https://spm.dev.learningwithparents.com/dashboard');
    });

    // Locally the two apps share a host and differ by port, so the subdomain rule cannot apply.
    it('points at the local port when the cookie domain is localhost', () => {
        expect(toSpmDashboardUrl('localhost')).toBe('http://localhost:3002/dashboard');
    });

    // manageCookies.js reads an unset cookie domain as localhost; this must agree with it.
    it('falls back to localhost when the cookie domain is unset', () => {
        expect(toSpmDashboardUrl('')).toBe('http://localhost:3002/dashboard');
        expect(toSpmDashboardUrl('   ')).toBe('http://localhost:3002/dashboard');
    });

    // A cookie domain is sometimes written with a leading dot; the hostname it implies has none.
    it('drops a leading dot rather than doubling it into the hostname', () => {
        expect(toSpmDashboardUrl('.learningwithparents.com')).toBe('https://spm.learningwithparents.com/dashboard');
    });
});
