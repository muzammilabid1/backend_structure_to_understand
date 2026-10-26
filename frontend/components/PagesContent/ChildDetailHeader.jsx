import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { ADMIN, MAGICPARENT, PARENT } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import Breadcrumb from '../Parent/Breadcrumb';
import CommonInactivePupilBanner from '../Shared/CommonInactivePupilBanner';

const ChildDetailHeader = ({ childName, pupil }) => {
    const { token, setChildDetails } = useContext(ThemeContext);
    const queryParams = useParams();

    useEffect(() => queryParams?.child_id && setChildDetails({ id: pupil?.pupil?.id, firstname: pupil?.pupil?.firstname }), [queryParams]);

    const breadCumbLists = [
        {
            route: [ADMIN, PARENT, MAGICPARENT].includes(token?.userType) ? `/parent/${token?.sub}` : `/child/${queryParams?.child_id}`,
            homeIcon: true
        },
        {
            label: childName
        }
    ];

    return (
        <>
            <section className="child-detail-header">
                <Breadcrumb breadcrumbLists={breadCumbLists} customClass="hide-on-mobile" />
            </section>
            {!pupil?.pupil?.currentClassOrGroupAcrossClasses?.id && <CommonInactivePupilBanner pupil={pupil} />}
        </>
    );
};

ChildDetailHeader.propTypes = {
    childName: PropTypes.string.isRequired,
    pupil: PropTypes.shape({
        pupil: PropTypes.shape({
            id: PropTypes.string.isRequired,
            firstname: PropTypes.string.isRequired,
            isActiveInCurrentAcademicYear: PropTypes.bool.isRequired
        }).isRequired
    }).isRequired
};

export default ChildDetailHeader;
