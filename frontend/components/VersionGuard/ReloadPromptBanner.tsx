import { memo, type MouseEvent, useCallback } from 'react';

import styles from './ReloadPromptBanner.module.scss';

export const ReloadPromptBanner = memo(function ReloadPromptBanner({ onReload }: { onReload: () => void }) {
    const onClick = useCallback(
        (evt: MouseEvent<HTMLAnchorElement>) => {
            evt.preventDefault();
            onReload();
        },
        [onReload]
    );

    return (
        <div className={styles.container}>
            <a className={styles.link} href="." onClick={onClick}>
                A new version of the app is available. Click to reload the page.
            </a>
        </div>
    );
});
