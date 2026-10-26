/* eslint-disable @typescript-eslint/no-explicit-any */
import { Collapse, Paper, SxProps, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { ReactNode, useState } from 'react';

import CommonPagination from '../CommonPagination';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

interface StyleProps {
    isChild: boolean;
}

const useStyles = makeStyles({
    table: {
        minWidth: ({ isChild }: StyleProps) => (!isChild ? 650 : 500),
        overflow: ({ isChild }: StyleProps) => (!isChild ? 'inherit' : 'hidden')
    }
});

interface CommonTableProps {
    children?: ReactNode;
    isChild?: boolean;
    head?: any[]; // Update with a more specific type if possible
    bold?: boolean;
    toggleIcon?: boolean;
    iconRight?: boolean;
    className?: string;
    TableContainerClassName?: string;
    actions?: boolean;
    pagination?: boolean;
    headTableCellStyle?: React.CSSProperties;
    sx?: SxProps;
}

const CommonTable = ({
    children,
    isChild = false,
    head,
    bold,
    toggleIcon,
    iconRight,
    className,
    TableContainerClassName = 'common_table_container',
    actions,
    pagination = false,
    headTableCellStyle = {},
    sx
}: CommonTableProps) => {
    const classes = useStyles({ isChild });
    const [collapseToggle, setCollapseToggle] = useState(true);

    return (
        <div className="common_table">
            <Collapse className={className} in={collapseToggle} collapsedSize={65}>
                <TableContainer component={Paper} className={TableContainerClassName} sx={sx}>
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
                                                    key={title}
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
                                                key={title}
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

export default CommonTable;
