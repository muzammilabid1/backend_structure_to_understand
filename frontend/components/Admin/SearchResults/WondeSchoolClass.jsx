import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath } from '../../../shared/Constant';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const WondeSchoolClassOverviewForSearch = ({ searchResults }) => {
    const head = ['Name', 'Class Code', 'Year Group'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Imported School Classes'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === 'WONDESCHOOLCLASS') || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell className="arrow_cursor">
                            <Link passHref href={`${adminPath}/wondeclass/${searchResult.wondeId}`}>
                                <Paragraph>{`${searchResult?.name}`}</Paragraph>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.code ?? '-'} />
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

WondeSchoolClassOverviewForSearch.propTypes = { searchResults: PropTypes.array };

export default WondeSchoolClassOverviewForSearch;
