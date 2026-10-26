import { describe, expect, it } from 'vitest';

import { expiredLinkMessage } from './index';

describe('expiredLinkMessage', () => {
    it('says nothing before the new link has been requested', () => {
        expect(expiredLinkMessage({ called: false, loading: false, error: undefined })).toBeNull();
    });

    it('says nothing while the new link is being sent', () => {
        expect(expiredLinkMessage({ called: true, loading: true, error: undefined })).toBeNull();
    });

    it('says a new link was sent once it has been', () => {
        expect(expiredLinkMessage({ called: true, loading: false, error: undefined })).toBe(
            'We have sent you another message with a new link. Please check your messages.'
        );
    });

    it('asks them to contact support when no new link could be sent', () => {
        expect(expiredLinkMessage({ called: true, loading: false, error: new Error('Invalid token') })).toBe(
            'This link can no longer be used. Please contact support.'
        );
    });
});
