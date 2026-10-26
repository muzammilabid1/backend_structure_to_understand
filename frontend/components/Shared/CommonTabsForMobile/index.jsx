import { Tab, Tabs } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import React from 'react';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const AntTabs = withStyles({
    indicator: {
        backgroundColor: '#F28D00'
    },
    flexContainer: {
        '&&& > button': {
            padding: '0 4px',
            flex: 1
        },
        '&&& > button.Mui-selected': {
            flex: 2
        }
    }
})(Tabs);

const CommonTabsForMobile = ({ tebs, children, value, onChange }) => {
    return (
        <div className="common_tab_mobile">
            <AntTabs indicatorColor="primary" textColor="inherit" value={value} centered onChange={(_, newValue) => onChange(newValue)}>
                {tebs.map((teb, key) => {
                    let item = <Paragraph text={teb} isTruncate />;

                    if (key === value) {
                        item = (
                            <div className={`${teb.length > 20 ? 'scroll-left' : ''} active `}>
                                <p>{teb}</p>
                            </div>
                        );
                    }

                    return <Tab key={key} disableRipple label={item} />;
                })}
            </AntTabs>

            {children}
        </div>
    );
};

CommonTabsForMobile.propTypes = {
    tebs: PropTypes.array.isRequired,
    children: PropTypes.element.isRequired,
    value: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    downloadLink: PropTypes.string,
    addBtn: PropTypes.string,
    filterContent: PropTypes.node
};

export default CommonTabsForMobile;
