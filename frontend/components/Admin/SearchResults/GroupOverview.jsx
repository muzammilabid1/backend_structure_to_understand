import { TableCell, TableRow } from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React from 'react';

import { adminPath, GROUP } from '../../../shared/Constant';
import CommonTable from '../../Shared/CommonTable';
import SubjectTags from '../../Shared/SubjectTags';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const GroupOverview = ({ searchResults }) => {
    const router = useRouter();

    const head = ['Group name', 'Main class', 'Main teacher', 'Group type'];

    return (
        <div className="classes_overview">
            <Heading3 text={'Group'} />
            <CommonTable head={head}>
                {((searchResults || [])?.filter((searchResult) => searchResult.type === GROUP) || []).map((searchResult) => (
                    <TableRow key={searchResult.id}>
                        <TableCell>
                            <Paragraph
                                customClass="cp underline"
                                onClick={() => router?.push(`${adminPath}/class/${searchResult.id}`)}
                                text={searchResult?.name}
                            />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.mainClassName} />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={searchResult?.mainTeacherName} />
                        </TableCell>
                        <TableCell>
                            <SubjectTags type={searchResult?.subjects} isReadingClass={searchResult?.isReadingGroup} />
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </div>
    );
};

GroupOverview.propTypes = { searchResults: PropTypes.array };

export default GroupOverview;
