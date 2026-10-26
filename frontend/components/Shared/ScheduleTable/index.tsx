import { Collapse, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useState } from 'react';

import CommonPagination from '../CommonPagination';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

interface ScheduleTableProps {
    children: React.ReactNode;
    head?: Array<string | { label: string; icon?: React.ReactNode }>;
    bold?: boolean;
    toggleIcon?: boolean;
    iconRight?: boolean;
    className?: string;
    actions?: boolean;
    isChild?: boolean;
    pagination?: boolean;
    headTableCellStyle?: React.CSSProperties;
}

const useStyles = makeStyles({
    table: {
        minWidth: ({ isChild }: { isChild: boolean }) => (!isChild ? 650 : 500),
        overflow: ({ isChild }: { isChild: boolean }) => (!isChild ? 'inherit' : 'hidden')
    }
});

const ScheduleTable = ({
    children,
    isChild = false,
    head,
    bold,
    toggleIcon,
    iconRight,
    className,
    actions,
    pagination = false,
    headTableCellStyle = {}
}: ScheduleTableProps) => {
    const classes = useStyles({ isChild });
    const [collapseToggle, setCollapseToggle] = useState(true);

    return (
        <div className="common_table">
            <Collapse className={className} in={collapseToggle} collapsedSize={65}>
                <TableContainer component={Paper}>
                    <Table className={classes.table} aria-label="caption table">
                        {head && (
                            <TableHead>
                                <TableRow>
                                    {toggleIcon && !iconRight && (
                                        <TableCell
                                            className="toggle_icon"
                                            onClick={() => setCollapseToggle(!collapseToggle)}
                                            style={headTableCellStyle}>
                                            <span className="material-icons">{collapseToggle ? 'expand_less' : 'expand_more'}</span>
                                        </TableCell>
                                    )}

                                    {(head || []).map((title, i) => {
                                        if (typeof title === 'object') {
                                            return (
                                                <TableCell
                                                    align={head.length - 1 === i && actions ? 'center' : 'left'}
                                                    // Keyed by position: this list is fixed per table, and several
                                                    // headings are deliberately blank, so labels are not unique.
                                                    key={i}
                                                    style={headTableCellStyle}>
                                                    {bold ? (
                                                        <Heading3 text={title.label} />
                                                    ) : (
                                                        <div className="headWithIcon">
                                                            <Paragraph text={title.label} />
                                                            {title.icon}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            );
                                        }

                                        return (
                                            <TableCell
                                                align={head.length - 1 === i && actions ? 'center' : 'left'}
                                                key={i}
                                                style={headTableCellStyle}>
                                                {bold ? (
                                                    <Heading3 text={title} />
                                                ) : (
                                                    <>
                                                        <Paragraph text={title} />
                                                    </>
                                                )}
                                            </TableCell>
                                        );
                                    })}

                                    {toggleIcon && iconRight && (
                                        <TableCell className="toggle_icon" style={headTableCellStyle}>
                                            <span onClick={() => setCollapseToggle(!collapseToggle)} className="material-icons">
                                                {collapseToggle ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                        )}
                        <TableBody>{children}</TableBody>
                    </Table>
                </TableContainer>
            </Collapse>
            {pagination && <CommonPagination count={10} />}
        </div>
    );
};

export default ScheduleTable;
