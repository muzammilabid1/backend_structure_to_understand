import { Tooltip } from '@mui/material';
import React, { useMemo } from 'react';
import { useFlexLayout, useResizeColumns, useRowSelect, useSortBy, useTable } from 'react-table';

import CommonLoading from '../CommonLoading';

/** The shape react-table hands a comparator: the row object the table was given, untouched. */
interface SortableRow {
    original: Record<string, unknown>;
}

interface Column {
    Header: string;
    accessor: string;
    disableSortBy?: boolean; // Add this property to control sorting per column
    /**
     * How two rows are compared for this column: one of react-table's built-in sort names, or a
     * comparator of your own.
     *
     * Needed when a cell renders an element rather than a bare value. The default comparison
     * stringifies the cell, so every row of such a column compares equal and the sort quietly does
     * nothing rather than failing where anyone would notice.
     */
    sortType?: string | ((rowA: SortableRow, rowB: SortableRow, columnId: string) => number);
    // Add more properties as needed based on your column configuration
}

interface CommonDraggableTableProps {
    columns: Column[]; // Replace 'Column' with the actual type for columns
    rows: unknown[]; // Replace 'unknown' with the actual type for rows
    loading?: boolean;
    customClass?: string; // Optional prop
    dataTest?: string;
}

interface TableProps {
    columns: Column[];
    data: unknown[];
    customClass?: string;
    dataTest?: string;
}

const Table = ({ columns, data, customClass, dataTest }: TableProps) => {
    const defaultColumn = useMemo(
        () => ({
            // When using the useFlexLayout:
            minWidth: 100, // minWidth is only used as a limit for resizing
            width: 150, // width is used for both the flex-basis and flex-grow
            maxWidth: 250 // maxWidth is only used as a limit for resizing
        }),
        []
    );

    const { getTableProps, headerGroups, rows, prepareRow } = useTable(
        {
            columns,
            data,
            defaultColumn
        },
        useSortBy,
        useResizeColumns,
        useFlexLayout,
        useRowSelect
    );

    return (
        <div className="table_main" data-test={dataTest}>
            <div {...getTableProps()} className={`table ${customClass}`}>
                {headerGroups.map((headerGroup) => (
                    <div {...headerGroup.getHeaderGroupProps()} className="tr">
                        {headerGroup.headers.map((column, index) => {
                            const sortProps = column.disableSortBy ? {} : column.getSortByToggleProps();

                            return (
                                <div
                                    {...column.getHeaderProps(headerGroup.headers.length - 1 !== index && sortProps)}
                                    className={`th ${column.hide ? 'hide' : ''}`}>
                                    {column.render('Header')}
                                    <div className="material-icons icon_size">
                                        <span>{column.isSorted ? (column.isSortedDesc ? 'arrow_downward' : 'arrow_upward') : ''}</span>
                                    </div>
                                    <div {...column.getResizerProps()} className={`resizer ${column.isResizing ? 'isResizing' : ''}`} />
                                </div>
                            );
                        })}
                    </div>
                ))}

                <div className="tbody">
                    {rows.map((row) => {
                        prepareRow(row);
                        const rowStyles = row.original.rowClassName;

                        return (
                            <div {...row.getRowProps()} className={`tr_row ${rowStyles}`}>
                                {row.cells.map((cell) => {
                                    const tooltip = cell.column.tooltip;

                                    return (
                                        <Tooltip title={tooltip ? cell.render('Cell') : null}>
                                            <div
                                                {...cell.getCellProps()}
                                                data-test="table-row-item"
                                                className={`td ${cell.column.hide ? 'hide' : ''}`}>
                                                {cell.render('Cell')}
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
            <br />
        </div>
    );
};

const CommonDraggableTable = ({ columns, rows, loading = false, customClass, dataTest }: CommonDraggableTableProps) => {
    if (loading) return <CommonLoading />;

    return <Table columns={columns} data={rows} customClass={customClass} dataTest={dataTest} />;
};

export default CommonDraggableTable;
