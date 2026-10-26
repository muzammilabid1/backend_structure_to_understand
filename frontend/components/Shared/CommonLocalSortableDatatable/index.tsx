/* eslint-disable @typescript-eslint/no-explicit-any */
import { Checkbox, Collapse, Grid, Paper, styled } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';

import LWPButton from '../Button/LWPButton';
import CommonTooltipIcon from '../CommonTooltipIcon';
import Heading3 from '../Typography/Heading3';

interface Row {
    id: string | number;
    [key: string]: any;
}

interface ButtonConfig {
    text: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
}
interface CommonLocalSortableDatatableProps {
    rows: Row[];
    columns: GridColDef[];
    setSelectedItem: (items: Row[]) => void;
    autoHeight?: boolean;
    autoPageSize?: boolean;
    disableColumnSelector?: boolean;
    checkboxSelection?: boolean;
    className?: string;
    selectedItem?: string[];
    rowHeight?: number;
    footerButtons?: ButtonConfig[];
    dataTest?: string;
    [key: string]: any;
}

const CommonLocalSortableDatatable = ({
    rows,
    columns,
    setSelectedItem,
    autoHeight = true,
    autoPageSize = false,
    disableColumnSelector = true,
    checkboxSelection = true,
    className = '',
    rowHeight = 72,
    selectedItem,
    dataTest = '',
    footerButtons,
    ...rest
}: CommonLocalSortableDatatableProps) => {
    const CustomCheckbox = styled(Checkbox)(({ theme }) => ({
        color: theme.palette.primary.contrastText,
        '&.Mui-checked': {
            color: theme.palette.primary.contrastText
        }
    }));

    return (
        <Grid
            sx={{
                position: 'relative',
                width: '100%'
            }}
            className={`main_sortable_table ${className}`}>
            <Paper className="mt8" data-test={dataTest}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    autoHeight={autoHeight}
                    rowHeight={rowHeight}
                    autoPageSize={autoPageSize}
                    disableColumnSelector={disableColumnSelector}
                    checkboxSelection={checkboxSelection}
                    rowSelectionModel={selectedItem}
                    onRowSelectionModelChange={(ids) => {
                        const selectedItemId = new Set(ids);
                        const selectedItems = rows.filter((row) => selectedItemId.has(row.id));

                        setSelectedItem(selectedItems);
                    }}
                    slots={{
                        baseCheckbox: CustomCheckbox
                    }}
                    {...rest}
                />
            </Paper>

            <Collapse
                unmountOnExit
                in={selectedItem?.length > 0}
                sx={{
                    position: 'sticky',
                    bottom: 0
                }}>
                <Grid
                    className="action-button-container"
                    component={Paper}
                    sx={{
                        mt: 1,
                        px: 4,
                        py: 3
                    }}>
                    <Grid container justifyContent={'space-between'} alignItems={'center'}>
                        <Heading3 text="Actions:" />
                        <Grid display={'flex'} alignItems={'center'} gap={1}>
                            {footerButtons?.map((btn, index) => (
                                <LWPButton
                                    key={index}
                                    btnText={btn.text}
                                    startIcon={btn.icon}
                                    sx={{
                                        borderRadius: '4px'
                                    }}
                                    onClick={btn.onClick}
                                    variant="outlined"
                                    color="inherit"
                                    loading={btn.loading}
                                    disabled={btn.disabled}
                                />
                            ))}

                            <CommonTooltipIcon icon={'close'} text={null} onClick={() => setSelectedItem([])} />
                        </Grid>
                    </Grid>
                </Grid>
            </Collapse>
        </Grid>
    );
};

export default CommonLocalSortableDatatable;
