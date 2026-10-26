import { Paper, Popper } from '@mui/material';
import React, { useState } from 'react';

import ShowStatisticsPupils from '../../Teacher/Cards/ClassStatsCard/ShowStatisticsPupils';
import Paragraph from '../Typography/Paragraph';

interface Status {
    className?: string;
    color: string;
    count: number;
    text?: string;
}

interface FooterItem {
    color: string;
    popOverText: string | JSX.Element;
}

interface CommonProgressBarProps {
    statistics: Status[];
    showPupil?: boolean;
    footer?: FooterItem[];
}

const CommonProgressBar = ({ statistics = [], showPupil, footer = [] }: CommonProgressBarProps) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [data, setData] = useState(null);

    const handleClick = (event, status) => {
        setData(status);
        setAnchorEl(event.currentTarget);
    };
    const handleleave = () => {
        setData(null);
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popper' : undefined;

    const state = footer?.find((item) => item?.color === data?.color);

    return (
        <>
            <div className="common_progress_bar">
                {statistics.map((status, key) => (
                    <div
                        key={key}
                        onMouseEnter={(e) => showPupil && handleClick(e, status)}
                        onMouseLeave={showPupil && handleleave}
                        className={`${status?.className} ${showPupil && 'cp'}`}
                        style={{ backgroundColor: status.color, flex: status.count }}>
                        {status.text}
                    </div>
                ))}
            </div>

            <Popper
                id={id}
                open={open}
                anchorEl={anchorEl}
                style={{
                    zIndex: 5
                }}>
                <Paper
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        padding: '16px',
                        margin: '20px 0 0 0 ',
                        boxShadow: '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)', // if there is a shadow
                        '& > :not(style)': {
                            flexGrow: 1,
                            margin: '4px',
                            borderRadius: '4px'
                        }
                    }}>
                    {data?.status ? <ShowStatisticsPupils data={data} /> : <Paragraph text={state?.popOverText} />}
                </Paper>
            </Popper>
        </>
    );
};

export default CommonProgressBar;
