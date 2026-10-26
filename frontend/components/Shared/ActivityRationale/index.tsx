import { useMutation, useQuery } from '@apollo/client';
import { SourceTypeForOpenCounter } from 'lwp-shared';
import React, { useEffect, useState } from 'react';

import { updateOpenCount } from '../../../graphQl/mutations';
import { getModal } from '../../../graphQl/queries';
import CommonActivityStepPreview from '../CommonActivityStepPreview';
import DialogBox from '../StaticActivityViews/dialog';
import Paragraph from '../Typography/Paragraph';

// Used for both the link and the modal heading: the modal's own name is an admin-facing label
// (rationales are re-used across activities), so it is never shown to parents.
const RATIONALE_TEXT = 'Why are we doing this activity?';

interface ActivityRationaleProps {
    activity?: { rationaleModal?: { id?: string } | null };
    // Only the real pupil-facing activity page should count opens
    increaseOpenCount?: boolean;
    // Topic type (reading/maths/english) used for the dialog border styling
    type?: string;
    pupilActivityContext?: string;
    readOnly?: boolean;
}

const ActivityRationale = ({ activity, increaseOpenCount = false, type, pupilActivityContext, readOnly }: ActivityRationaleProps) => {
    const rationaleModalId = activity?.rationaleModal?.id;
    const [open, setOpen] = useState(false);
    const { data: modalData } = useQuery(getModal, { variables: { id: rationaleModalId }, skip: !rationaleModalId });
    const [updateOpenCountMutation] = useMutation(updateOpenCount);

    useEffect(() => {
        if (open && increaseOpenCount && rationaleModalId) {
            updateOpenCountMutation({
                variables: { input: { id: rationaleModalId, type: SourceTypeForOpenCounter.MODAL } }
            });
        }
    }, [open, increaseOpenCount, rationaleModalId]);

    if (!rationaleModalId) return null;

    return (
        <div className="activity-rationale">
            <Paragraph
                customClass="activity-rationale__link"
                onClick={() => setOpen(true)}
                dataTest="activity-rationale-trigger"
                centerText
                text={RATIONALE_TEXT}
            />

            {open && (
                <DialogBox open={open} setOpen={() => setOpen(!open)} type={type} heading={RATIONALE_TEXT}>
                    <CommonActivityStepPreview
                        steps={modalData?.['getModal']?.steps?.legacySteps}
                        pupilActivityContext={pupilActivityContext}
                        increaseModalOpenCount={false}
                        increaseLinkOpenCount={false}
                        readOnly={readOnly}
                    />
                </DialogBox>
            )}
        </div>
    );
};

export default ActivityRationale;
