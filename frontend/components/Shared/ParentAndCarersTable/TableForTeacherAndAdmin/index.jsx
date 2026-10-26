import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import TableRows from './TableRows';

const ParentsAndCarersTableForTeacher = ({ pupil, heading, getOptions, removeParentConfirmation, viewType }) => {
    return (
        <TableContainer component={Paper} className="parent_cares_for_teacher">
            <Table aria-label="collapsible table">
                <TableHead className="care_header">
                    <TableRow>
                        {heading.map((item) => (
                            <TableCell>{item}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>

                <TableBody>
                    {(pupil?.['pupil']?.parents || [])?.map((pupilParent, index) => (
                        <TableRows
                            pupilParent={pupilParent}
                            index={index}
                            getOptions={getOptions}
                            removeParentConfirmation={removeParentConfirmation}
                            viewType={viewType}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

ParentsAndCarersTableForTeacher.propTypes = {
    heading: PropTypes.array,
    pupil: PropTypes.object,
    getOptions: PropTypes.func,
    removeParentConfirmation: PropTypes.func,
    viewType: PropTypes.string
};

export default ParentsAndCarersTableForTeacher;
