/* eslint-disable padding-line-between-statements */
/* eslint-disable @next/next/no-img-element */
import { List, ListItem, ListItemIcon, ListItemText, useMediaQuery, useTheme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FeatureTooltipTargets } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { isViewAsMode, ThemeContext } from '../../../shared/Services/handler';
import CommonBadge from './../CommonBadge';
import Heading3 from './../Typography/Heading3';
import Paragraph from './../Typography/Paragraph';

const useStyles = makeStyles({
    color: {
        color: 'black'
    },
    activeColor: {
        color: '#f28d00'
    },
    flex: {
        display: 'flex'
    },
    flexDirection: {
        flexDirection: 'row-reverse'
    },
    justifyContent: {
        justifyContent: 'flex-end'
    }
});

interface ListItemType {
    text?: string;
    route?: string;
    /** Other paths, and any page beneath them, on which this item also shows as the current one. */
    activeRoutes?: string[];
    icon?: string;
    image?: string;
    activeImage?: string;
    bold?: boolean;
    color?: string;
    iconRight?: boolean;
    badge?: string | number;
    onClick?: () => void;
    dataTest?: string;
    popOver?: React.ReactNode;
    disabled?: boolean;
    // `route` points at another host, so the row links out instead of routing within this app.
    external?: boolean;
}

interface CommonListWithIconProps {
    list: ListItemType[];
    input?: {
        isMobile?: boolean;
        toggle?: boolean;
    };
    dataTest?: string;
    className?: string;
}

const CommonListWithIcon = ({ list, input, dataTest, className }: CommonListWithIconProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const classes = useStyles();
    const { token } = useContext(ThemeContext);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [forceRender, setForceRender] = useState(true);

    const showChildDetailsMenu = () => {
        switch (pathname) {
            case `/child/[child_id]`:
            case `/child/[child_id]/reading`:
            case `/topic/[topic_id]`:
            case `/activity/[activity_id]`:
            case `/child/[child_id]/trophies`:
            case `/child/[child_id]/history`:
            case `/child/[child_id]/topics`:
            case `/child/[child_id]/weeks`:
            case `/child/[child_id]/book-history`:
                return true;

            default:
                return false;
        }
    };

    useEffect(() => {
        if (
            list.some(
                (x) => x.route == `/school/${token?.schoolId}/topic-library` || x.route == `/school/${token?.schoolId}/log-reading`
            ) &&
            input
        ) {
            setForceRender(!forceRender);
        }
    }, [list, input]);

    return (
        <List component="nav" className={`common_nav_list nav_bar_focus ${className ?? ''}`} data-test={dataTest}>
            {list.map((item) => {
                if (
                    (item.text === 'Child details' && !showChildDetailsMenu()) ||
                    (isViewAsMode(token?.userType, pathname) && (item?.text === 'FAQs' || item?.text === 'Sign out')) ||
                    (!isViewAsMode(token?.userType, pathname) && (item?.text === 'Exit parent view' || item?.text === 'Parent FAQs'))
                )
                    return;

                // Get ID based on route
                let listItemId = null;
                const schoolBaseRoute = `/school/${token?.schoolId}`;

                switch (item?.route) {
                    case `${schoolBaseRoute}/topic-library`:
                        listItemId = FeatureTooltipTargets.TOPIC_LIBRARY;
                        break;
                    case `${schoolBaseRoute}/log-reading`:
                        listItemId = FeatureTooltipTargets.SCHOOL_READING_LOG;
                        break;
                    case `${schoolBaseRoute}/reports`:
                        listItemId = FeatureTooltipTargets.SCHOOL_ANALYTICS_AND_REPORTS;
                        break;
                    case `${schoolBaseRoute}/settings`:
                        listItemId = FeatureTooltipTargets.SCHOOL_SETTINGS;
                        break;
                    case `${schoolBaseRoute}/resources`:
                        listItemId = isMobile ? FeatureTooltipTargets.HELP_AND_RESOURCES : null;
                        break;
                }

                const isActive = item.route === pathname || Boolean(item.activeRoutes?.some((route) => pathname?.startsWith(route)));
                const routeRow = (
                    <ListItem
                        key={item.text}
                        id={listItemId}
                        data-test={item?.dataTest}
                        className={`${classes.flex} ${item.iconRight ? classes.flexDirection : ''} ${isActive ? 'active-list-item' : ''}`}
                        onClick={(e) => {
                            if (!item.external && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                window.open(item.route, '_blank');
                            } else {
                                if (item.onClick) {
                                    item.onClick();
                                }
                            }
                        }}
                        // Add ARIA label
                        aria-label={item.text}>
                        <ListItemIcon className={item.iconRight ? classes.justifyContent : ''}>
                            {item.icon ? (
                                <span
                                    className={`${'material-icons'} ${isActive ? classes.activeColor : item.color || classes.color}`}
                                    // Icons are decorative
                                    aria-hidden="true">
                                    {item.icon}
                                </span>
                            ) : item.image ? (
                                <img
                                    src={item.route === router?.asPath ? item.activeImage : item.image}
                                    alt="list icon"
                                    className="svg-icon"
                                />
                            ) : (
                                ''
                            )}
                        </ListItemIcon>
                        <ListItemText primary={item.bold ? <Heading3 text={item.text} /> : <Paragraph text={item.text} />} />
                        {item.badge && <CommonBadge badgeContent={item.badge} />}
                        {item.popOver}
                    </ListItem>
                );

                return (
                    <>
                        {item?.route ? (
                            item.external ? (
                                // a plain anchor tag works here, we don't need next/link
                                <a href={item.route} target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
                                    {routeRow}
                                </a>
                            ) : (
                                <Link href={item?.route} style={{ width: '100%' }}>
                                    {routeRow}
                                </Link>
                            )
                        ) : (
                            <ListItem
                                key={item.text}
                                data-test={item?.dataTest}
                                className={`${classes.flex} ${item.iconRight ? classes.flexDirection : ''} on_nonlink_list cp`}
                                onClick={() => {
                                    if (!item.disabled && typeof item.onClick === 'function') {
                                        item.onClick();
                                    }
                                }}
                                aria-label={item.text}
                                disabled={item.disabled}>
                                <ListItemIcon className={item.iconRight ? classes.justifyContent : ''}>
                                    {item.icon ? (
                                        <span
                                            className={`${'material-icons'} ${
                                                item.route === router?.asPath ? classes.activeColor : item.color || classes.color
                                            }`}
                                            aria-hidden="true">
                                            {item.icon}
                                        </span>
                                    ) : item.image ? (
                                        <img
                                            src={item.route === router?.asPath ? item.activeImage : item.image}
                                            alt="list icon"
                                            className="svg-icon"
                                        />
                                    ) : (
                                        ''
                                    )}
                                </ListItemIcon>
                                <ListItemText primary={item.bold ? <Heading3 text={item.text} /> : <Paragraph text={item.text} />} />
                                {item.badge && <CommonBadge badgeContent={item.badge} />}
                                {item.popOver}
                            </ListItem>
                        )}
                    </>
                );
            })}
        </List>
    );
};

export default CommonListWithIcon;
