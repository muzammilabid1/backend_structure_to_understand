import { TableCell, TableRow } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath } from '../../../shared/Constant';
import { capitalizeFirstLetter } from '../../../shared/Services/handler';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
const PupilOverviewForSearch = ({ searchResults }) => {
    const head = ['Name', 'Premium', 'Status'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Pupils'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === 'PUPIL') || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell className="arrow_cursor">
                            <Link passHref href={`${adminPath}/child/${searchResult.id}`}>
                                <Paragraph>{`${searchResult?.name}`}</Paragraph>
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult.isPremium ? 'Yes' : 'No'} />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={capitalizeFirstLetter(searchResult.pupilStatus ?? '-')} />
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </div>
    );
};

PupilOverviewForSearch.propTypes = { searchResults: PropTypes.array };

export default PupilOverviewForSearch;
