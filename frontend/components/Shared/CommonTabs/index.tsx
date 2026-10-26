import { Grid, Tab, Tabs } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import React, { ReactNode } from 'react';

import LWPButton from '../Button/LWPButton';
import CommonBadge from '../CommonBadge';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonPopOver from '../CommonPopOver';

const AntTabs = withStyles({
    indicator: {
        backgroundColor: '#F28D00'
    }
})(Tabs);

interface AddBtnItem {
    text: string;
    icon: string;
    iconRight?: boolean;
    bold?: boolean;
    onClick?: () => void;
}

interface CommonTabsProps {
    tebs: (string | { label: string; dataTest?: string; badge?: number })[];
    children: ReactNode;
    value: number;
    onChange: (newValue: number) => void;
    downloadLink?: string;
    filterContent?: ReactNode;
    addBtn?: AddBtnItem[]; // Use the Add
}

const CommonTabs = ({ tebs, children, value, onChange, downloadLink, filterContent, addBtn }: CommonTabsProps) => {
    return (
        <div className="common_tebs">
            <AntTabs
                indicatorColor="primary"
                textColor="inherit"
                value={value}
                onChange={(e, newValue) => onChange(newValue)}
                aria-label="ant example">
                {tebs.map((teb, key) => {
                    const label =
                        typeof teb !== 'string' ? (
                            <Grid display={'flex'} alignItems={'center'}>
                                {teb?.label}
                                {teb?.badge ? <CommonBadge badgeContent={teb?.badge} className="tab-badge" /> : null}
                            </Grid>
                        ) : (
                            teb
                        );

                    return (
                        <Tab
                            key={key}
                            disableRipple
                            label={label}
                            className="tebs"
                            data-test={typeof teb !== 'string' ? teb.dataTest : undefined}
                        />
                    );
                })}
                {(downloadLink || filterContent || addBtn) && (
                    <div className="btn_group">
                        {filterContent && (
                            <CommonPopOver bold text="Filter" icon="arrow_drop_down" iconClassName="ml2">
                                {filterContent}
                            </CommonPopOver>
                        )}
                        {downloadLink && (
                            <LWPButton endIcon="get_app" customClass="cancel_btn" variant="text" btnText="Download CSV" color="inherit" />
                        )}
                        {addBtn && <CommonListWithIcon list={addBtn} />}
                    </div>
                )}
            </AntTabs>
            {children}
        </div>
    );
};

export default CommonTabs;
