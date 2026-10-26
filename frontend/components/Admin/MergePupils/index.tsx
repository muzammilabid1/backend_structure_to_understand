import { useQuery } from '@apollo/client';
import { useCallback, useMemo, useState } from 'react';

import { getPupilForAdminPupilView } from '../../../graphQl/queries';
import LWPButton from '../../Shared/Button/LWPButton';
import PupilDetail from '../../Shared/PupilDetail/PupilDetail';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import ConfirmationModal from './ConfirmationModal';
import styles from './index.module.scss';
import SelectPupilModal from './SelectPupilModal';
import type { GetPupilData, PupilInfo } from './types';

const mapGetPupilDataToPupilDetails = (getPupilData: GetPupilData | null | undefined): PupilInfo => ({
    ...getPupilData?.pupil,
    dateOfBirth: getPupilData?.pupil?.dateOfBirth ? new Date(getPupilData?.pupil?.dateOfBirth) : null,
    schoolClassName: getPupilData?.pupil?.currentClass?.name,
    parents: getPupilData?.pupil?.parents?.map((parent) => ({
        ...parent.parent
    }))
});

export default function MergePupils({ pupilAId }: { pupilAId: string }) {
    const [pupilBId, setPupilBId] = useState<string | null>(null);
    const [mergeTarget, setMergeTarget] = useState<'a' | 'b'>('b');

    const [isMergePupilsModalOpen, setIsMergePupilsModalOpen] = useState(false);
    const toggleMergePupilsModal = useCallback(() => setIsMergePupilsModalOpen((prev) => !prev), []);

    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const toggleConfirmationModal = useCallback(() => setIsConfirmationModalOpen((prev) => !prev), []);

    const { data: pupilAData } = useQuery<GetPupilData>(getPupilForAdminPupilView, {
        variables: { id: pupilAId }
    });

    const { data: pupilBData } = useQuery<GetPupilData>(getPupilForAdminPupilView, {
        variables: { id: pupilBId },
        skip: !pupilBId
    });

    const pupilA = useMemo(() => mapGetPupilDataToPupilDetails(pupilAData), [pupilAData]);

    const pupilB = useMemo(() => mapGetPupilDataToPupilDetails(pupilBData), [pupilBData]);

    const differingFields = useMemo(
        () =>
            Object.entries({
                UPN: pupilA?.UPN !== pupilB?.UPN,
                firstname: pupilA?.firstname !== pupilB?.firstname,
                lastname: pupilA?.lastname !== pupilB?.lastname,
                dateOfBirth: pupilA?.dateOfBirth !== pupilB?.dateOfBirth,
                gender: pupilA?.gender !== pupilB?.gender,
                yearGroup: pupilA?.yearGroup !== pupilB?.yearGroup,
                schoolClassName: pupilA?.schoolClassName !== pupilB?.schoolClassName
            })
                .filter(([, v]) => v)
                .map(([k]) => k),
        [pupilA, pupilB]
    );

    return (
        <>
            <div className={styles.comparePupilsContainer}>
                <div className={mergeTarget === 'a' ? styles.selected : ''} onClick={() => setMergeTarget('a')}>
                    <header>
                        <input type="radio" checked={mergeTarget === 'a'} />
                        <Heading3 text="Pupil A" />
                    </header>
                    <PupilDetail pupilDetails={pupilA} />
                </div>
                <div
                    className={mergeTarget === 'b' ? styles.selected : ''}
                    style={{ display: 'flex', flexDirection: 'column' }}
                    onClick={pupilBId ? () => setMergeTarget('b') : undefined}>
                    <header>
                        <input type="radio" checked={mergeTarget === 'b'} />
                        <Heading3
                            text="Pupil B"
                            style={{ textDecoration: 'underline', cursor: 'pointer' }}
                            onClick={toggleMergePupilsModal}
                        />
                    </header>
                    <div style={{ display: 'flex', flexGrow: '1', alignItems: 'center' }}>
                        {pupilBId ? (
                            <PupilDetail pupilDetails={pupilB} highlightedFields={differingFields} />
                        ) : (
                            <Paragraph
                                style={{ flexGrow: 1, padding: '1.5rem', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' }}
                                onClick={toggleMergePupilsModal}>
                                + Select pupil for merge
                            </Paragraph>
                        )}
                    </div>
                </div>
            </div>
            <LWPButton disabled={!pupilBId} onClick={toggleConfirmationModal}>
                Confirm merge
            </LWPButton>
            <SelectPupilModal
                isOpen={isMergePupilsModalOpen}
                toggleIsOpen={toggleMergePupilsModal}
                schoolId={pupilA?.school?.id}
                pupilAId={pupilA?.id}
                onSelectPupilBId={setPupilBId}
            />
            <ConfirmationModal
                isOpen={isConfirmationModalOpen}
                toggleIsOpen={toggleConfirmationModal}
                mergeTarget={mergeTarget}
                pupilAId={pupilAId}
                pupilBId={pupilBId}
            />
        </>
    );
}
