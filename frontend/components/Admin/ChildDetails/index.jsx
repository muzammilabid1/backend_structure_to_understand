import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import { adminPath } from '../../../shared/Constant';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import Classes from './Classes';
import Details from './Details';
import Parents from './Parents';

const ChildDetailsAdmin = () => {
    const queryParams = useParams();
    const router = useRouter();

    const [active, setActive] = useState(1);
    const [childName, setChildName] = useState('Pupil name');
    const [schoolId, setSchoolId] = useState();
    const { setClaims } = useDelegatedClaims();

    return (
        <div className="child_details">
            <LWPButton
                btnText="Back to class school"
                startIcon="navigate_before"
                color="inherit"
                variant="text"
                size="medium"
                onClick={() => router?.push(`${adminPath}/school/${schoolId}`)}
            />
            <div className="header">
                <Heading2 text={`${childName}`} />
                <div className="header-view-button">
                    <LWPButton btnText="View as parent" startIcon="visibility" href={`/child/${queryParams?.child_id}`} />
                    <LWPButton
                        btnText="View as teacher"
                        startIcon="visibility"
                        onClick={() => {
                            setClaims({
                                schoolId
                            });
                            router?.push(`/pupil/${queryParams?.child_id}`);
                        }}
                    />
                </div>
            </div>
            <CommonTabs tebs={['Parents', 'Details', 'Classes']} value={active} onChange={setActive}>
                {active === 0 ? (
                    <Parents />
                ) : active === 1 ? (
                    <Details setChildName={setChildName} setSchoolId={setSchoolId} />
                ) : (
                    <Classes />
                )}
            </CommonTabs>
        </div>
    );
};

export default ChildDetailsAdmin;
