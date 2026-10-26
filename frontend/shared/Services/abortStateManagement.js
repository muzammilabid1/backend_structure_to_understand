import { useEffect, useState } from 'react';

/**
 * createRefreshableAbortController creates an AbortController instance that,
 * on being aborted, is updated as a React stateful value to a new AbortController.
 * This should only be called from within a React component, as it makes use of
 * useState and useEffect hooks.
 *
 * @return {AbortController} the reference to the AbortController
 */
export const createRefreshableAbortController = () => {
    const [stateController, setStateController] = useState(new AbortController());

    useEffect(() => {
        stateController.signal.addEventListener('abort', () => {
            setStateController(new AbortController());
        });
    }, [stateController]);

    return stateController;
};
