import { useRef, useState } from 'react';

/**
 * savingLocks are the method by which subcomponents may report that they are blocking the
 * submission of the reading log owing to "saving" some content.
 *
 * Locks should be set with a component name equal to the field name in values that is expected
 * to be set, and with a value that is equal to either true, for "save in progress", false,
 * for "save cancelled with no data", or the data of the field that is meant to be being saved,
 * for "save completed successfully".
 *
 * The inclusion of the ultimate data result is important because Formik and React forms
 * asynchronously update without promises (see https://github.com/jaredpalmer/formik/issues/529),
 * and so there is no guarantee that when we call handleSubmit the handleChange events have been
 * processed.
 *
 * {@label SavingLocksInfo}
 */
export function useSavingLock() {
    const savingLocks = useRef<SavingLock>({});
    const onSaveComplete = useRef<OnSaveComplete>(() => {});
    // State mirror of hasSavingLock(), so components re-render when an upload starts or ends.
    const [isSaving, setIsSaving] = useState(false);

    /**
     * @returns true if a saving lock is active; false otherwise
     * @see :SavingLocksInfo
     */
    const hasSavingLock = () => Object.values(savingLocks.current).some((v) => v === true);

    /**
     * Sets a saving lock for a given field name.
     *
     * @param {string} propertyName the name of the field on the form to update
     * @param {false | true | any} value true, for "save in progress";
     *  false, for "save cancelled with no data";
     *  or the data of the field that is meant to be being saved, for "save
     *  completed successfully".
     * @see :SavingLocksInfo
     */
    const setSavingLock = (propertyName: string, value: boolean | any) => {
        // Only set a false saving lock if we're terminating the process with nothing completed.
        // This avoids a scenario where we override the overrides provided through the locking system.
        if (savingLocks.current[propertyName] !== true && value === false) {
            return;
        }

        savingLocks.current = { ...savingLocks.current, [propertyName]: value };
        setIsSaving(hasSavingLock());

        if (onSaveComplete.current && !hasSavingLock()) {
            onSaveComplete.current(savingLocks.current);
        }
    };

    function setOnSaveComplete(newOnSaveComplete: OnSaveComplete) {
        onSaveComplete.current = newOnSaveComplete;
    }

    return {
        isSaving,
        hasSavingLock,
        setSavingLock,
        setOnSaveComplete
    };
}

type SavingLock = Record<string, boolean>;
type OnSaveComplete = (savingLock: SavingLock) => void;
