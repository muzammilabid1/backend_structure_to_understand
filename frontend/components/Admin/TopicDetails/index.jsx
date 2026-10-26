import { Grid } from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import CommonTabs from '../../Shared/CommonTabs';
import Heading2 from '../../Shared/Typography/Heading2';
import Activities from './Activities';
import Details from './Details';

const TopicDetailsForAdmin = () => {
    const [active, setActive] = useState(0);
    const [className, setClassName] = useState({ name: '' });
    const [open, setOpen] = useState(false);
    const searchParams = useSearchParams();
    const queryParams = useParams();

    const tebs = ['Details', 'Activities'];

    useEffect(() => {
        if (searchParams.get('tab') === '1') setActive(1);
    }, [searchParams]);

    const addBtnObj = [
        {
            text: 'Add an activity',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpen(!open)
        }
    ];

    return (
        <div className="teacher_detials activity_detail_for_admin">
            <Grid container alignItems={`center`} gap={2}>
                <Heading2 text={className?.name} />
            </Grid>
            <CommonTabs addBtn={active === 1 && addBtnObj} tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? (
                    <Details setClassName={setClassName} topic_id={queryParams?.topic_id} />
                ) : (
                    <Activities open={open} setClassName={setClassName} setOpen={setOpen} topic_id={queryParams?.topic_id} />
                )}
            </CommonTabs>
        </div>
    );
};

export default TopicDetailsForAdmin;
