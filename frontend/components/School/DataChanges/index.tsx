import { ImportStatus } from 'lwp-shared';
import { useRouter } from 'next/router';

import { useDataChangesReview } from '../../../context/DataChangesReviewContext';
import DiffingChanges from './DiffingChanges';
import LastImportStatus from './LastImportStatus';
import LinkClasses from './LinkClasses';
import LinkPupils from './LinkPupils';

const DataChanges = () => {
    const { schoolStatus, school } = useDataChangesReview();
    const { query } = useRouter();

    return (
        <div className="data-changes-container">
            {schoolStatus === ImportStatus.LINKING_PUPILS ? (
                <LinkPupils />
            ) : schoolStatus === ImportStatus.LINKING_CLASSES ? (
                <LinkClasses />
            ) : /**
             * We show the diffing view if the import process is in the DIFFING_ENTITIES state,
             * or if the user has explicitly opted to view previously rejected changes.
             * The `includeRejectedChanges` query parameter is set by the LastImportStatus component
             * when the user enables the "Include previously rejected changes" toggle, allowing them
             * to review rejected entries after resolving all pending changes.
             */
            schoolStatus === ImportStatus.DIFFING_ENTITIES || query?.includeRejectedChanges ? (
                <DiffingChanges />
            ) : (
                <LastImportStatus school={school} />
            )}
        </div>
    );
};

export default DataChanges;
