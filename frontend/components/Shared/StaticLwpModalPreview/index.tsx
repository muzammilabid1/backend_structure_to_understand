import { useMutation, useQuery } from '@apollo/client';
import { SourceTypeForOpenCounter } from 'lwp-shared';
import React, { useContext, useEffect, useState } from 'react';

import { updateOpenCount } from '../../../graphQl/mutations';
import { getModal } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonActivityStepPreview from '../CommonActivityStepPreview';
import DialogBox from '../StaticActivityViews/dialog';

interface StaticLwpModalPreviewProps {
    selectedModalId?: string;
    type?: string;
    btnText?: string;
    btnType?: string;
    /** The pupil's saved activity context, a JSON string. */
    pupilActivityContext?: string;
    readOnly?: boolean;
    increaseModalOpenCount?: boolean;
}

const StaticLwpModalPreview = ({
    selectedModalId,
    type,
    btnText = 'Click Me',
    btnType = 'PRIMARY',
    pupilActivityContext,
    readOnly,
    increaseModalOpenCount = false
}: StaticLwpModalPreviewProps) => {
    const [open, setOpen] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);
    const { error: error, data: modalData } = useQuery(getModal, { variables: { id: selectedModalId } });
    const [updateOpenCountMutation] = useMutation(updateOpenCount);

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (open && increaseModalOpenCount && selectedModalId) {
            updateOpenCountMutation({
                variables: {
                    input: {
                        id: selectedModalId,
                        type: SourceTypeForOpenCounter.MODAL
                    }
                }
            });
        }
    }, [open, increaseModalOpenCount, selectedModalId]);

    return (
        <div className="activity-step-modal">
            <LWPButton color={btnType === 'SECONDARY' ? 'inherit' : 'primary'} btnText={btnText} onClick={() => setOpen(true)} />

            {open && (
                <DialogBox
                    className="finger_space_lolly_stick_dialog_box"
                    open={open}
                    setOpen={() => setOpen(!open)}
                    type={type}
                    heading={modalData?.['getModal']?.name}>
                    <CommonActivityStepPreview
                        steps={modalData?.['getModal']?.steps?.legacySteps}
                        pupilActivityContext={pupilActivityContext}
                        increaseModalOpenCount={increaseModalOpenCount}
                        increaseLinkOpenCount={increaseModalOpenCount}
                        readOnly={readOnly}
                    />
                </DialogBox>
            )}
        </div>
    );
};

export default StaticLwpModalPreview;
