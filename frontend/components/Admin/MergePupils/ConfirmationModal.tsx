import { useMutation } from '@apollo/client';
import { List, ListItem } from '@mui/material';
import { behaviour } from 'lwp-shared';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useState } from 'react';

import { mergePupils } from '../../../graphQl/mutations';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import DialogWrapper from '../../Shared/DialogWrapper';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

type Props = {
    isOpen: boolean;
    toggleIsOpen: () => void;
    mergeTarget: 'a' | 'b';
    pupilAId: string | null | undefined;
    pupilBId: string | null | undefined;
};

export default function ConfirmationModal({ isOpen, toggleIsOpen, mergeTarget, pupilAId, pupilBId }: Props) {
    const { callSnackbar } = useContext(ThemeContext);

    const router = useRouter();

    const [isConfirmed, setIsConfirmed] = useState(false);
    const toggleIsConfirmed = useCallback(() => setIsConfirmed((prev) => !prev), []);

    const [mergePupilsMutation, { loading: mergePupilsLoading }] = useMutation(mergePupils, {
        refetchQueries: [],
        awaitRefetchQueries: true
    });

    const onConfirmMerge = useCallback(async () => {
        const sourcePupilId = mergeTarget === 'a' ? pupilBId : pupilAId;
        const destinationPupilId = mergeTarget === 'a' ? pupilAId : pupilBId;
        const postMergeUrl = `/admin/child/${destinationPupilId}`;

        await mergePupilsMutation({
            variables: {
                sourcePupilId,
                destinationPupilId
            }
        })
            .then(() => {
                callSnackbar('Pupils have been merged', 'success');
                toggleIsOpen();
                router?.push(postMergeUrl);
            })
            .catch((err) => {
                toggleIsOpen();
                callSnackbar(`Error merging pupil: ${err}`, 'error');
            });
    }, [mergeTarget, pupilAId, pupilBId]);

    const sourcePupil = mergeTarget === 'a' ? 'Pupil B' : 'Pupil A';
    const destinationPupil = mergeTarget === 'a' ? 'Pupil A' : 'Pupil B';

    return (
        <DialogWrapper
            heading={'Confirm Pupil Merge'}
            open={isOpen}
            setOpen={() => {
                setIsConfirmed(false);
                toggleIsOpen();
            }}
            primaryBtnText="Confirm merge"
            primaryBtnDisabled={!pupilAId || !pupilBId || !isConfirmed}
            primaryBtnloading={mergePupilsLoading}
            primaryBtnHandler={onConfirmMerge}
            dialogFooter
            cancelBtn
            cancelBtnText="Cancel">
            <Paragraph>
                All data from the selected pupil will be preserved and relevant data from the unselected pupil will be brought across. Other
                data will be deleted. This action is permanent and cannot be undone. Please confirm that you have read and understood the
                important information before continuing.
            </Paragraph>
            <Heading3 text="Important information" />
            <List sx={{ listStyleType: 'disc', pl: 2 }}>
                <ListItem sx={{ display: 'list-item', pl: 0, mt: 0 }}>
                    <Paragraph>
                        All reading weeks, topics and activities that had been assigned to {sourcePupil} but not {destinationPupil} will be
                        assigned to {destinationPupil}.
                    </Paragraph>
                </ListItem>
                <ListItem sx={{ display: 'list-item', pl: 0, mt: 0 }}>
                    <Paragraph>
                        All entries that had been submitted by {sourcePupil} will be reassigned to {destinationPupil} (and assigned to the
                        appropriate reading week or activity).
                    </Paragraph>
                </ListItem>
                <ListItem sx={{ display: 'list-item', pl: 0 }}>
                    <Paragraph>
                        All other details associated with {sourcePupil} will be deleted. Note that any differing parents associated with{' '}
                        {sourcePupil} will NOT be reassigned to {destinationPupil}.
                    </Paragraph>
                </ListItem>
                {behaviour.mergePupils.removeSourcePupilFromClasses && !behaviour.mergePupils.removeSourcePupilFromSchool && (
                    <ListItem sx={{ display: 'list-item', pl: 0 }}>
                        <Paragraph>{sourcePupil} will be removed from any classes of which they are currently a member.</Paragraph>
                    </ListItem>
                )}
                {behaviour.mergePupils.removeSourcePupilFromSchool && (
                    <ListItem sx={{ display: 'list-item', pl: 0 }}>
                        <Paragraph>{sourcePupil} will be removed from the school.</Paragraph>
                    </ListItem>
                )}
            </List>
            <CommonCheckBox
                label="I have read and understand the important information."
                checked={isConfirmed}
                onChange={toggleIsConfirmed}
            />
        </DialogWrapper>
    );
}
