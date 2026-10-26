import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath } from '../../../shared/Constant';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const TeacherOverviewForSearch = ({ searchResults }) => {
    const head = ['Name', 'Email Address', 'Phone Number'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Teachers'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === 'TEACHER') || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell className="arrow_cursor">
                            <Link passHref href={`${adminPath}/teacher/${searchResult.id}`}>
                                <Paragraph>{`${searchResult?.name}`}</Paragraph>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.email ?? '-'} />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.phone ?? '-'} />
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </div>
    );
};

TeacherOverviewForSearch.propTypes = { searchResults: PropTypes.array };

export default TeacherOverviewForSearch;
