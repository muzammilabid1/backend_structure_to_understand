/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { List, ListItem, ListItemText } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { SchoolClassStatus } from '../../../shared/Constant';
import { renderClassIcon } from '../../../shared/Services/handler';
import Paragraph from '../Typography/Paragraph';
import CommonBadge from './../CommonBadge';
import Divider from './../Divider';
import Heading1 from './../Typography/Heading1';

const CommonDropDown = ({ heading, tabItem }) => {
    return (
        <List className="sidebar-options-list">
            <Heading1 text={heading} />
            <Divider />
            {(tabItem || []).map((schoolClass) => {
                const { classIcon, isFullProgramOrOnlyReadyTeddy } = renderClassIcon(schoolClass);

                return (
                    <span key={schoolClass.id}>
                        <Link passHref href={`/class/${schoolClass.id}/readingweek`}>
                            <a rel="noopener noreferrer">
                                <ListItem className="list-item" button>
                                    {heading === 'My classes' && schoolClass?.status === SchoolClassStatus.ACTIVE && (
                                        <div className={isFullProgramOrOnlyReadyTeddy ? 'class-programme-icon' : 'class-reading-icon'}>
                                            <img src={classIcon} />
                                        </div>
                                    )}
                                    <ListItemText>
                                        <Paragraph customClass="truncate" text={schoolClass.name} />
                                        {schoolClass.badgeCount && <CommonBadge badgeContent={schoolClass.badgeCount} />}
                                    </ListItemText>
                                </ListItem>
                            </a>
                        </Link>
                    </span>
                );
            })}
        </List>
    );
};

CommonDropDown.propTypes = {
    tabLists: PropTypes.array.isRequired,
    heading: PropTypes.string,
    tabItem: PropTypes.array,
    onClick: PropTypes.func
};

CommonDropDown.defaultProps = {
    tabLists: []
};

export default CommonDropDown;
