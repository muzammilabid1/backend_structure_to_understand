import { Tab, Tabs } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Link from 'next/link';
import React from 'react';

const MuiTabs = withStyles({
    indicator: {
        backgroundColor: '#F28D00'
    }
})(Tabs);

export interface RouteTab {
    label: string;
    href: string;
    dataTest: string;
}

/**
 * Tabs where each tab is a link to its own route rather than local state, so a tab can be linked to,
 * reloaded and come back to from a page further in.
 */
const RouteTabs = ({ tabs, active, ariaLabel }: { tabs: RouteTab[]; active: number; ariaLabel: string }) => (
    <div className="common_tebs">
        <MuiTabs value={active} aria-label={ariaLabel}>
            {tabs.map((tab, key) => (
                <Link key={tab.href} passHref href={tab.href} scroll={false} data-test={tab.dataTest}>
                    <Tab disableRipple label={tab.label} className={`tebs ${key === active ? 'Mui-selected' : ''}`} />
                </Link>
            ))}
        </MuiTabs>
    </div>
);

export default RouteTabs;
