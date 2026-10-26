import { Tooltip, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import React, { ReactElement, ReactNode, useState } from 'react';

type CommonTooltipIconProps = {
    text?: string | ReactNode;
    customIconClass?: string;
    icon?: string | ReactElement;
    onClick?: () => void;
    iconComponent?: string | ReactElement;
    img?: ReactElement;
    dataTest?: string;
};

const LightTooltip = withStyles((theme) => ({
    tooltip: {
        backgroundColor: theme.palette.common.white,
        color: 'rgba(0, 0, 0, 0.87)',
        boxShadow: theme.shadows[1],
        fontSize: 11
    }
}))(Tooltip);

const CommonTooltipIcon = ({
    text = 'I am an icon',
    customIconClass = null,
    icon = 'info_outlined',
    onClick = () => {},
    iconComponent = null,
    img,
    dataTest = ''
}: CommonTooltipIconProps) => {
    const [showTooltip, setShowTooltip] = useState(true);

    return (
        <LightTooltip
            data-test={dataTest}
            className="cursor-help"
            title={
                text && (
                    <React.Fragment>
                        <Typography variant="subtitle2">{text}</Typography>
                    </React.Fragment>
                )
            }
            onOpen={() => setShowTooltip(true)}
            onClose={() => setShowTooltip(false)}
            enterTouchDelay={0}>
            {img ? (
                img
            ) : (
                <span
                    onClick={() => {
                        setShowTooltip(!showTooltip);
                        onClick();
                    }}
                    className={`material-icons common-tool-tip-icon ${customIconClass}`}>
                    {iconComponent ? iconComponent : icon}
                </span>
            )}
        </LightTooltip>
    );
};

export default CommonTooltipIcon;
