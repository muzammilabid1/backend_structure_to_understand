import { memo, type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { ReloadPromptBanner } from './ReloadPromptBanner';

const pollingIntervalMillis = 60 * 1e3; // 1 minute

export const VersionGuard = memo(function VersionGuard({ children }: PropsWithChildren) {
    const [showReloadBanner, setShowReloadBanner] = useState(false);

    useEffect(() => {
        const abortController = new AbortController();

        const interval = setInterval(async () => {
            try {
                const response = await fetch(
                    '/api/version',
                    {
                        signal: abortController.signal,
                        cache: 'no-cache',
                        priority: 'low'
                    } as RequestInit // HACK(cj): Workaround for next build using node fetch typedefs instead of the browser typedefs in the CI build
                );
                const { buildId } = await response.json();

                if (!buildId) {
                    throw new Error('buildId is falsy');
                }

                setShowReloadBanner(buildId > process.env.BUILD_ID);
            } catch (err) {
                setShowReloadBanner(false);
                console.log('Error:', err);
            }
        }, pollingIntervalMillis);

        return () => {
            abortController.abort();
            clearInterval(interval);
        };
    }, []);

    const onReload = useCallback(() => {
        window.location.reload();
    }, []);

    return (
        <>
            {showReloadBanner && <ReloadPromptBanner onReload={onReload} />}
            {children}
        </>
    );
});
