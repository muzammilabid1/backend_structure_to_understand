import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath } from '../../../shared/Constant';
import { capitalizeFirstLetter } from '../../../shared/Services/handler';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const WondeStudentOverviewForSearch = ({ searchResults }) => {
    const head = ['Name', 'Premium', 'UPN'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Imported Students'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === 'WONDESTUDENT') || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell className="arrow_cursor">
                            <Link passHref href={`${adminPath}/wondechild/${searchResult.wondeId}`}>
                                <Paragraph>{`${searchResult?.name}`}</Paragraph>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult.isPremium ? 'Yes' : 'No'} />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={capitalizeFirstLetter(searchResult.UPN ?? '-')} />
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </div>
    );
};

WondeStudentOverviewForSearch.propTypes = { searchResults: PropTypes.array };

export default WondeStudentOverviewForSearch;
