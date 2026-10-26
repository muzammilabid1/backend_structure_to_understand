import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

import CommonLoading from './../CommonLoading';
import CommonPagination from './../CommonPagination';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%'
    },
    paper: {
        width: '100%',
        marginBottom: theme.spacing(2)
    },
    table: {
        minWidth: 750
    },
    visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1
    }
}));

function CommonPaginationTable({
    head,
    children,
    loading,
    pagination,
    paginaitonLoading,
    paginaitonDefaultPage,
    paginaitonOnChange,
    paginaitonPagesCount
}) {
    const classes = useStyles();

    return (
        <div className={`common_sortable_table_container ${classes.root}`}>
            <Paper className={classes.paper}>
                <TableContainer>
                    <Table className={classes.table} aria-labelledby="tableTitle" aria-label="enhanced table">
                        <TableHead>
                            <TableRow>
                                {(head || []).map((headCell) => (
                                    <TableCell key={headCell.id}>{headCell.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        {!loading && <TableBody>{children}</TableBody>}
                    </Table>
                    {loading && <CommonLoading />}
                </TableContainer>
            </Paper>
            {pagination && (
                <CommonPagination
                    disabled={paginaitonLoading}
                    defaultPage={paginaitonDefaultPage}
                    onChange={paginaitonOnChange}
                    count={paginaitonPagesCount}
                />
            )}
        </div>
    );
}

CommonPaginationTable.propTypes = {
    head: PropTypes.array,
    children: PropTypes.element,
    order: PropTypes.number,
    setOrder: PropTypes.func,
    orderBy: PropTypes.number,
    setOrderBy: PropTypes.func,
    loading: PropTypes.bool,
    pagination: PropTypes.bool,
    paginaitonLoading: PropTypes.bool,
    paginaitonDefaultPage: PropTypes.number,
    paginaitonOnChange: PropTypes.func,
    paginaitonPagesCount: PropTypes.number
};

export default CommonPaginationTable;
