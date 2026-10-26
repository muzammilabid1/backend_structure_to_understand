import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath } from '../../../shared/Constant';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const WondeSchoolOverviewForSearch = ({ searchResults }) => {
    const head = ['Name', 'URN'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Imported Schools'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === 'WONDESCHOOL') || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell className="arrow_cursor">
                            <Link passHref href={`${adminPath}/school/${searchResult.id}`}>
                                <Paragraph>{`${searchResult?.name}`}</Paragraph>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.urn ?? '-'} />
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </div>
    );
};

WondeSchoolOverviewForSearch.propTypes = { searchResults: PropTypes.array };

export default WondeSchoolOverviewForSearch;
