import { Divider, Drawer, Grid } from '@mui/material';
import React from 'react';

import { TEACHER } from '../../../shared/Constant';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import Heading2 from '../../Shared/Typography/Heading2';
import ParentAndCarersTable from './../../Shared/ParentAndCarersTable';

interface Pupil {
    id: string;
    fullname: string;
}

interface DrawerState {
    pupil: Pupil | null;
    open: boolean;
}

interface ParentsCaresDrawerProps {
    drawerState: DrawerState;
    setDrawerState: React.Dispatch<React.SetStateAction<DrawerState>>;
}

const ParentsCaresDrawer = ({ drawerState, setDrawerState }: ParentsCaresDrawerProps) => {
    const onDrawerClosed = () => {
        setDrawerState({ pupil: null, open: false });
    };

    return (
        <>
            <Drawer
                variant="temporary"
                className="common_tebs pupil-tab-drawer"
                ModalProps={{
                    keepMounted: false
                }}
                anchor={'right'}
                open={drawerState?.open}
                onClose={onDrawerClosed}>
                <Grid p={4} width={{ md: 850, xs: 375 }}>
                    <Grid container justifyContent={'space-between'} alignItems={'center'}>
                        <Heading2 text={`${drawerState?.pupil?.fullname} Parents/carers`} />
                        <CommonTooltipIcon icon={'closed'} text={null} onClick={onDrawerClosed} />
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <div className={'teacher-pupil-details'}>
                        <ParentAndCarersTable child_id={drawerState?.pupil?.id} viewType={TEACHER} />
                    </div>
                </Grid>
            </Drawer>
        </>
    );
};

export default ParentsCaresDrawer;
