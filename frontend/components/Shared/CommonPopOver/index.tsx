/* eslint-disable @next/next/no-img-element */
import { useMediaQuery, useTheme } from '@mui/material';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { makeStyles } from '@mui/styles';
import { usePathname } from 'next/navigation';
import React, { CSSProperties, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useStyles = makeStyles((theme: any) => ({
    typography: {
        padding: theme.spacing(2)
    },
    popover: {
        pointerEvents: 'none'
    },
    paper: {
        padding: theme.spacing(1)
    }
}));

interface CommonPopOverProps {
    children: React.ReactNode;
    text?: string;
    icon?: string;
    image?: string;
    iconImage?: string;
    iconColor?: string;
    iconClassName?: string;
    hover?: boolean;
    isOpen?: boolean;
    setIsOpen?: (isOpen: boolean) => void;
    element?: React.ReactNode;
    className?: string;
    childrenClass?: string;
    style?: CSSProperties;
    bold?: boolean;
    closeOnClick?: boolean;
    arrow?: boolean;
    anchorOriginVertical?: 'top' | 'center' | 'bottom';
    anchorOriginHorizontal?: 'left' | 'center' | 'right';
    transformOriginVertical?: 'top' | 'center' | 'bottom';
    transformOriginHorizontal?: 'left' | 'center' | 'right';
    dataTest?: string;
}

const CommonPopOver = ({
    children,
    text,
    icon,
    iconColor,
    iconClassName,
    image,
    hover,
    element,
    className,
    style,
    bold,
    isOpen,
    setIsOpen,
    childrenClass,
    iconImage,
    anchorOriginVertical = 'bottom',
    anchorOriginHorizontal = 'center',
    transformOriginVertical = 'top',
    transformOriginHorizontal = 'center',
    closeOnClick = true,
    arrow = false,
    dataTest
}: CommonPopOverProps) => {
    const theme = useTheme();
    const smbp = useMediaQuery(theme.breakpoints.up('sm'));
    const classes = useStyles({ smbp });
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const pathname = usePathname();

    useEffect(() => {
        if (!isOpen) {
            setAnchorEl(null);
        }
    }, [pathname, isOpen]);

    const open = Boolean(anchorEl);

    useEffect(() => {
        if (setIsOpen) {
            setIsOpen(open);
        }
    }, [open]);

    const id = open && hover ? 'mouse-over-popover' : open ? 'simple-popover' : undefined;

    return (
        <div className={className}>
            <Typography
                aria-owns={id}
                aria-haspopup="true"
                onMouseEnter={hover ? handleOpen : undefined}
                onMouseLeave={hover ? handleClose : undefined}
                onClick={!hover ? handleOpen : undefined}
                className={`common_drop_down`}
                style={style}
                data-test={dataTest}>
                {text ? (
                    bold ? (
                        <Heading3 customClass={'textClassName'} style={{ marginBottom: 0 }} text={text} />
                    ) : (
                        <Paragraph customClass={'textClassName'} text={text} />
                    )
                ) : null}

                {element}
                {image && <img src={image} className="down-arrow-icon" alt="Icon" />}
                {icon && (
                    <span style={{ color: iconColor || 'black' }} className={`material-icons ${iconClassName}`}>
                        {icon}
                    </span>
                )}
                {iconImage && (
                    <img
                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${iconImage}`}
                        alt="iconImage"
                    />
                )}
            </Typography>

            {children && (
                <Popover
                    id={id}
                    open={open}
                    anchorEl={anchorEl}
                    className={`${hover && classes.popover} common-popover`}
                    classes={arrow ? { paper: 'sticker_arrow' } : hover && { paper: classes.paper }}
                    onClose={!hover ? handleClose : undefined}
                    disableRestoreFocus
                    anchorOrigin={{ vertical: anchorOriginVertical, horizontal: anchorOriginHorizontal }}
                    transformOrigin={{ vertical: transformOriginVertical, horizontal: transformOriginHorizontal }}>
                    <Typography className={`${classes.typography} ${childrenClass}`}>
                        <span onClick={!hover && closeOnClick ? handleClose : undefined}>{children}</span>
                    </Typography>
                </Popover>
            )}
        </div>
    );
};

export default CommonPopOver;
