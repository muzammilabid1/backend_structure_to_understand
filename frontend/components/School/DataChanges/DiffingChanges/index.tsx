import { Grid } from '@mui/material';
import { ImportStatus } from 'lwp-shared';
import moment from 'moment';
import { useState } from 'react';

import { useDataChangesReview } from '../../../../context/DataChangesReviewContext';
import CommonTabs from '../../../Shared/CommonTabs';
import Heading1 from '../../../Shared/Typography/Heading1';
import PupilChanges from './PupilChanges';

const DiffingChanges = () => {
    const { school } = useDataChangesReview();
    const [active, setActive] = useState<number>(0);

    const misName = school?.misName && school?.misName != '[Unknown]' ? school?.misName : 'Wonde';

    return (
        <div className="diffing-changes-container" data-test="diffing-changes-page">
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                <Grid item flexGrow={1}>
                    <Heading1
                        text={`Data changes from ${misName}${school?.lastImportedAt && school?.importStatus !== ImportStatus.COMPLETE ? ` on ${moment(school?.lastImportedAt).format('ddd DD MMM, YYYY')}` : ''}`}
                    />
                </Grid>
            </Grid>
            <CommonTabs tebs={['Pupils']} value={active} onChange={setActive}>
                <PupilChanges />
            </CommonTabs>
        </div>
    );
};

export default DiffingChanges;
