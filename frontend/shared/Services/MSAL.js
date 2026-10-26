import { PublicClientApplication } from '@azure/msal-browser';

let msalInstance;

/**
 * Gets the active MSAL instance.
 *
 * @return {Promise<import('@azure/msal-browser').IPublicClientApplication>}
 */
export const getMsalInstance = async () => {
    if (msalInstance) return msalInstance;

    msalInstance = await PublicClientApplication.createPublicClientApplication({
        auth: {
            clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
            redirectUri: `${process.env.NEXT_PUBLIC_HOSTED_URL}/blank.html`
        }
    });

    return msalInstance;
};
