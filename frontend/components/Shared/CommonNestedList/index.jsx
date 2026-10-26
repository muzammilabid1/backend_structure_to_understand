/* eslint-disable react/prop-types */
/* eslint-disable @next/next/no-img-element */

import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { ListItemButton } from '@mui/material';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useRouter } from 'next/compat/router';
import { usePathname } from 'next/navigation';
import { useContext, useState } from 'react';

import { SchoolClassStatus } from '../../../shared/Constant';
import { isAdminViewAsMode, ThemeContext } from '../../../shared/Services/handler';
import { renderClassIcon } from '../../../shared/Services/handler';

const CommonNestedList = ({ data, isSchoolLeader, dataTest, nonItalic = true, active }) => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const { token } = useContext(ThemeContext);
    const pathname = usePathname();
    const showSchoolLeaderSideBar = isAdminViewAsMode(token?.userType, pathname);

    const handleClick = () => {
        setOpen(!open);
    };

    return (
        <List component="nav" className="side_bar_nav nav_bar_focus groups-and-classes" aria-label="Class Navigation">
            {/* Use aria-label to describe the purpose of the list */}
            <ListItem className={active ? 'active-list-item' : ''}>
                <div
                    data-test={dataTest}
                    onClick={() =>
                        router.push({
                            pathname:
                                isSchoolLeader || showSchoolLeaderSideBar
                                    ? `/class/${data?.id}/readingweek`
                                    : !data?.isMyClass
                                      ? `/class/${data?.id}/only-groups`
                                      : `/class/${data?.id}/readingweek`
                        })
                    }
                    style={{ width: '100%', cursor: 'pointer' }}
                    // Descriptive ARIA label for links
                    aria-label={`Navigate to ${data?.name} details`}>
                    <div className="align-items-center">
                        {data?.status === SchoolClassStatus.ACTIVE && (
                            <ListItemIcon>
                                <div className="class-register-header-container" style={{ margin: 'auto 0' }}>
                                    <div
                                        className={
                                            renderClassIcon(data).isGroupAcrossClasses
                                                ? 'class-register-header-image-group-across-classes'
                                                : renderClassIcon(data).isFullProgramOrOnlyReadyTeddy
                                                  ? 'class-register-header-image-fullProgramme'
                                                  : 'class-register-header-image-reading'
                                        }>
                                        <img src={renderClassIcon(data).classIcon} alt="logo" />
                                    </div>
                                </div>
                            </ListItemIcon>
                        )}
                        <ListItemText
                            data-test="common-nested-list-name"
                            primary={data?.name}
                            style={{
                                fontStyle: `${!data?.isMyClass && nonItalic ? 'italic' : ''}`,
                                color: '#000',
                                maxWidth: !!data?.groups?.length ? '153px' : '100%'
                            }}
                        />
                    </div>
                </div>
                {!!data?.groups?.length && (
                    <div onClick={handleClick} aria-label="Toggle Group List">
                        {open ? <ExpandLess /> : <ExpandMore />}
                    </div>
                )}
            </ListItem>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding aria-label="Sub-group Navigation">
                    {/* Nested List with descriptive aria-label */}
                    {data?.groups?.map((group) => (
                        <ListItemButton
                            className="class-groups-list"
                            onClick={() => router.push(`/class/${group?.id}/readingweek`)}
                            aria-label={`Navigate to ${group?.name} details`}>
                            <ListItemIcon></ListItemIcon>
                            <ListItemText primary={group?.name} />
                        </ListItemButton>
                    ))}
                </List>
            </Collapse>
        </List>
    );
};

export default CommonNestedList;
