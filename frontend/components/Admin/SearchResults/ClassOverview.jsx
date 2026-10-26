import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath } from '../../../shared/Constant';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const ClassOverviewForSearch = ({ searchResults }) => {
    const head = ['Name', 'Class Size', 'Year Group'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Classes'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === 'CLASS') || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell className="arrow_cursor">
                            <Link passHref href={`${adminPath}/class/${searchResult.id}`}>
                                <Paragraph>{`${searchResult?.name}`}</Paragraph>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.classSize ?? '-'} />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.yearGroup ?? '-'} />
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </div>
    );
};

ClassOverviewForSearch.propTypes = { searchResults: PropTypes.array };

export default ClassOverviewForSearch;
