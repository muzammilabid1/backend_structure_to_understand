import { useMediaQuery, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import CommonTabsForMobile from '../CommonTabsForMobile';
import CommonTabs from './../CommonTabs';
import ModalDataInTab from './ModalDataInTab';

const CommonTabsStep = ({ tabsData }) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.down('md'));

    const [active, setActive] = useState(0);
    const [headers, setHeaders] = useState([]);

    useEffect(() => {
        if (tabsData?.length > 0) {
            setHeaders(tabsData?.map((tab) => tab?.header));
        }
    }, [tabsData]);

    const getModalId = (tab) => {
        return tabsData[tab]?.modalId;
    };

    return (
        <div className="activity-step-tabs">
            {smbp ? (
                <CommonTabsForMobile tebs={headers} value={active} onChange={setActive} />
            ) : (
                <CommonTabs tebs={headers} value={active} onChange={setActive} />
            )}

            <ModalDataInTab modalId={getModalId(active)} />
        </div>
    );
};

CommonTabsStep.propTypes = {
    tabsData: PropTypes.array.isRequired
};

export default CommonTabsStep;
