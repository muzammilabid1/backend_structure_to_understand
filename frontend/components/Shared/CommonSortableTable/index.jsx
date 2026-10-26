import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import React from 'react';

import CommonLoading from './../CommonLoading';
import CommonPagination from './../CommonPagination';

// sortable table funcs start
function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }

    if (b[orderBy] > a[orderBy]) {
        return 1;
    }

    return 0;
}

export function getComparator(order, orderBy) {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
}

export function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);

    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);

        if (order !== 0) return order;

        return a[1] - b[1];
    });

    return stabilizedThis.map((el) => el[0]);
}

function EnhancedTableHead(props) {
    const { classes, order, orderBy, onRequestSort, head } = props;

    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };
    // sortable table funcs end

    return (
        <TableHead>
            <TableRow>
                {(head || []).map((headCell) => (
                    <TableCell key={headCell.id} sortDirection={orderBy === headCell.id ? order : false}>
                        <TableSortLabel
                            disabled={!headCell.id}
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}>
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <span className={classes.visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </span>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

EnhancedTableHead.propTypes = {
    classes: PropTypes.object.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    order: PropTypes.oneOf(['asc', 'desc']).isRequired,
    orderBy: PropTypes.string.isRequired,
    head: PropTypes.array.isRequired
};

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

function CommonSortableTable({
    head,
    children,
    order,
    setOrder,
    orderBy,
    setOrderBy,
    loading,
    pagination,
    paginaitonLoading,
    paginaitonDefaultPage,
    paginaitonOnChange,
    paginaitonPagesCount
}) {
    const classes = useStyles();

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';

        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    return (
        <div className={`common_sortable_table_container ${classes.root}`}>
            <Paper className={classes.paper}>
                <TableContainer>
                    <Table className={classes.table} aria-labelledby="tableTitle" aria-label="enhanced table">
                        <EnhancedTableHead
                            classes={classes}
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                            head={head}
                        />
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

CommonSortableTable.propTypes = {
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

export { CommonSortableTable };
