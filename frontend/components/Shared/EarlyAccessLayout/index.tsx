import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import MuiAlert from '@mui/material/Alert';
import React from 'react';

const EarlyAccessLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="early-access-layout">
            <MuiAlert icon={<ScienceOutlinedIcon />}>
                This feature is available for early access - there may be further updates changes to how it works during this phase, and we
                would value your feedback on it.
            </MuiAlert>
            {children}
        </div>
    );
};

export default EarlyAccessLayout;
