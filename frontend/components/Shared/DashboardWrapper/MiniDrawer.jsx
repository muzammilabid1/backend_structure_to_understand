import { ClickAwayListener, styled, useMediaQuery } from '@mui/material';
import MuiDrawer from '@mui/material/Drawer';
import { useTheme } from '@mui/styles';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { useTooltip } from '../../../context/TooltipContext';
import { FeatureTooltipTargets } from 'lwp-shared';

const drawerWidth = 290;

const openedMixin = (theme, zIndex) => ({
    width: drawerWidth,
    zIndex: zIndex,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen
    }),
    overflowX: 'hidden'
});

const closedMixin = (theme) => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
    }),
    overflowX: 'hidden',
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up('sm')]: {
        width: `calc(${theme.spacing(8)} + 1px)`
    },
    '& .drawer-header': { padding: '16px 21px' },
    '& .MuiPaper-root': { overflow: 'hidden' },
    '& .side_bar_nav': { display: 'none' },
    '& .class_and_groups_mini': { display: 'block' }
});

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    transition: 'all 0.3s',
    '& .MuiBadge-root': { display: 'none' },
    ...(open && {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
        '& .MuiBadge-root': { display: 'block' },
        [theme.breakpoints.down('lg')]: {
            transitionDelay: '7200s'
        }
    }),
    ...(!open && {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
        '& h1': { color: 'transparent' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' }
    }),
    '&:hover': {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme, !open && 1202),
        transitionDelay: '7200s',
        '& h1': { color: '#000' },
        '& .MuiPaper-root': { overflowY: 'auto' },
        '& .side_bar_nav': { display: 'block' },
        '& .class_and_groups_mini': { display: 'none' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.23)' },
        '& .MuiBadge-root': { display: 'block' }
    }
}));

const SIDER_BAR_TOOLTIP_IDS = [
    FeatureTooltipTargets.TOPIC_LIBRARY,
    FeatureTooltipTargets.SCHOOL_READING_LOG,
    FeatureTooltipTargets.SCHOOL_ANALYTICS_AND_REPORTS,
    FeatureTooltipTargets.SCHOOL_SETTINGS,
    FeatureTooltipTargets.MY_CLASSES_AND_GROUPS
];

const ArrowWrapper = styled('div')(({ theme, open }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: open ? '' : '#fff',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    position: 'fixed',
    top: theme.spacing(2),
    left: open ? 252 : 66,
    borderRadius: open ? '200px 0px 0px 200px' : '0px 200px 200px 0px',
    zIndex: 1201,
    cursor: 'pointer',
    transition: theme.transitions.create('right', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
    }),
    '&:hover': {
        backgroundColor: '#e0e0e0' // Color when hovered
    },
    '& .material-icons': { rotate: open ? '' : '180deg' }
}));

const MiniDrawer = ({ children, open, setOpen, isFocused, isAdminViewAsMode }) => {
    const theme = useTheme();

    const isLargeDesktop = useMediaQuery(theme.breakpoints.down('xl'));
    const isMediumDesktop = useMediaQuery(theme.breakpoints.down('lg'));
    const { joyrideSteps, stepIndex } = useTooltip();

    const isSideBarTooltipsVisible =
        joyrideSteps?.length > 0 ? SIDER_BAR_TOOLTIP_IDS.includes(joyrideSteps?.[stepIndex]?.target?.replace('#', '')) : false;

    useEffect(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const sideBar = localStorage.getItem('sideBar') === 'open';

            if (isSideBarTooltipsVisible) {
                setOpen(true);
            } else if (!isLargeDesktop) {
                setOpen(true);
            } else if (isMediumDesktop) {
                setOpen(false);
            } else if (isLargeDesktop) {
                setOpen(sideBar);
            }
        }
    }, [isLargeDesktop, isSideBarTooltipsVisible]);

    const handleDrawerClose = () => {
        setOpen(!open);

        if (!isMediumDesktop) {
            localStorage.setItem('sideBar', !open ? 'open' : 'closed');
        }
    };

    const clickAwayHandler = () => {
        if (isMediumDesktop && !isSideBarTooltipsVisible) {
            setOpen(false);
        }
    };

    return (
        <ClickAwayListener onClickAway={clickAwayHandler}>
            <div className="teacher-admin-side-mini-drawer">
                {isLargeDesktop ? (
                    <ArrowWrapper
                        onClick={handleDrawerClose}
                        open={open}
                        className={`side-drawer-arrow ${isAdminViewAsMode ? 'side-drawer-arrow-icon-admin-viewing-mode' : ''}`}
                        data-test={'side-drawer-arrow'}>
                        <span className="material-icons icon">chevron_left</span>
                    </ArrowWrapper>
                ) : (
                    ''
                )}
                <Drawer
                    variant="permanent"
                    className={`teacher-admin-side-drawer ${open ? 'side-drawer-open' : 'side-drawer-close'}`}
                    open={open || isFocused}
                    PaperProps={{
                        className: isAdminViewAsMode ? 'admin-is-on-viewing-mode' : ''
                    }}
                    ModalProps={{
                        keepMounted: true
                    }}>
                    {children}
                </Drawer>
            </div>
        </ClickAwayListener>
    );
};

MiniDrawer.propTypes = {
    children: PropTypes.element.isRequired,
    open: PropTypes.bool,
    setOpen: PropTypes.func,
    isFocused: PropTypes.bool
};

export default MiniDrawer;
