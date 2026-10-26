import DataChanges from '../../../../components/School/DataChanges';
import { DataChangesReviewProvider } from '../../../../context/DataChangesReviewContext';
import { PageType } from '../../../../types/enums/PageType';

const DataChangesReview = () => (
    <DataChangesReviewProvider>
        <DataChanges />
    </DataChangesReviewProvider>
);

DataChangesReview.pageType = PageType.SCHOOL_LEADER;
DataChangesReview.pageTitle = 'School: Data changes';

export default DataChangesReview;
