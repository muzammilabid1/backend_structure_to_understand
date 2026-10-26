import PropTypes from 'prop-types';
import React from 'react';

import InputField from './../../Shared/InputField/InputField';

const WondeDetails = ({ wondeInfo }) => {
    return (
        <div>
            <InputField md={4} lg={4} label="Wonde id" value={wondeInfo.id} disabled />
            <InputField md={4} lg={4} label="Wonde forename" value={wondeInfo.forename || '-'} disabled />
            <InputField md={4} lg={4} label="Wonde surname" value={wondeInfo.surname || '-'} disabled />
            <InputField md={4} lg={4} label="Wonde gender" value={wondeInfo.gender || '-'} disabled />
            <InputField md={4} lg={4} label="Wonde premium" value={wondeInfo?.isPremium || '-'} disabled />
            <InputField
                md={4}
                lg={4}
                label="Wonde initials"
                value={wondeInfo?.initials === '[Unknown]' ? '-' : wondeInfo?.initials}
                disabled
            />
            <InputField md={4} lg={4} label="Wonde UPN" value={wondeInfo.UPN || '-'} disabled />
            <InputField md={4} lg={4} label="Wonde mis id" value={wondeInfo.mis_id || '-'} disabled />
        </div>
    );
};

WondeDetails.propTypes = {
    wondeInfo: PropTypes.object
};

export default WondeDetails;
