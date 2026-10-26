import { TableCell, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import RenderHtml from '../CommonRenderHtml';
import CommonTable from '../CommonTable';

const TableActivity = ({ headers, rows }) => {
    return (
        <div className="activity-step-table">
            {(headers || [])?.every((item) => !item?.trim()) ? (
                <CommonTable>
                    {(rows || []).map((row, idx) => (
                        <TableRow key={idx}>
                            {Object.keys(row)?.map((item) => {
                                return <TableCell>{<RenderHtml text={row[item]} />}</TableCell>;
                            })}
                        </TableRow>
                    ))}
                </CommonTable>
            ) : (
                <CommonTable head={headers}>
                    {(rows || []).map((item, idx) => (
                        <TableRow key={idx}>
                            {headers.map((head) => {
                                // <TableCell>{item?.[`${head?.toLowerCase()?.split(' ')?.join('')}`]}</TableCell>
                                return (
                                    <TableCell>{<RenderHtml text={item?.[`${head?.toLowerCase()?.split(' ')?.join('')}`]} />}</TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </CommonTable>
            )}
        </div>
    );
};

TableActivity.propTypes = {
    headers: PropTypes.array,
    rows: PropTypes.array
};

export default TableActivity;
