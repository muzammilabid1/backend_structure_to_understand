import { TableCell, TableRow } from '@mui/material';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React from 'react';

import { capitalizeFirstLetter } from '../../../shared/Services/handler';
import CommonTable from '../../Shared/CommonTable';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const MisLinkedPupilTable = ({ pupil }) => {
    const queryParams = useParams();

    const pupilDetailsFromMIS = ['Pupil name', `${pupil?.school?.misName} ID`, 'Gender', 'Year group'];
    const parentLinkedInMis = ['Parent name', 'Email', 'Phone no.', 'Relevance'];
    const classesLinkedInMis = ['Classes', `${pupil?.school?.misName} ID`, 'Year group', 'Class type'];

    return (
        <div className="mis-pupil-detail-container">
            <CommonTable head={pupilDetailsFromMIS}>
                <TableRow key={pupil?.importedStudent?.id}>
                    <TableCell>
                        <Paragraph>{`${pupil?.importedStudent?.forename} ${pupil?.importedStudent?.surname}`}</Paragraph>
                    </TableCell>
                    <TableCell>
                        <Paragraph text={pupil?.importedStudent?.mis_id ?? '-'} />
                    </TableCell>
                    <TableCell>
                        <Paragraph text={capitalizeFirstLetter(pupil?.importedStudent?.gender) ?? '-'} />
                    </TableCell>
                    <TableCell>
                        <Paragraph text={pupil?.yearGroup ?? '-'} />
                    </TableCell>
                </TableRow>
            </CommonTable>
            <Heading3 text={`Parents linked in ${pupil?.school?.misName}`} />
            <CommonTable head={parentLinkedInMis}>
                {(pupil?.parents || []).map((pupilParent) =>
                    pupilParent?.parent?.importedContacts?.map((importedContact) => {
                        const isSamePupil = importedContact?.importedStudentContacts?.find(
                            (importedStudentContact) => importedStudentContact?.importedStudent?.lwpPupil?.id === queryParams?.pupil_id
                        );

                        return (
                            <TableRow key={importedContact?.id}>
                                <TableCell>
                                    <Paragraph>{`${importedContact?.forename} ${importedContact?.surname}`}</Paragraph>
                                </TableCell>
                                <TableCell>
                                    <Paragraph>{`${importedContact?.email ? importedContact?.email : '-'}`}</Paragraph>
                                </TableCell>
                                <TableCell>
                                    <Paragraph>{`${importedContact?.phoneNumber ? importedContact?.phoneNumber : '-'}`}</Paragraph>
                                </TableCell>
                                <TableCell>
                                    <Paragraph>
                                        {isSamePupil?.parental_responsibility
                                            ? 'Parental responsibility'
                                            : isSamePupil?.priority === 1
                                              ? 'Priority 1'
                                              : '-'}
                                    </Paragraph>
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </CommonTable>
            <Heading3 text={`Classes linked in ${pupil?.school?.misName}`} />
            <CommonTable head={classesLinkedInMis}>
                {(pupil?.classes || []).map((pupilClass) => {
                    return (
                        <TableRow key={pupilClass?.id}>
                            <TableCell>
                                <Paragraph>{pupilClass?.importedSchoolClass?.name}</Paragraph>
                            </TableCell>
                            <TableCell>
                                <Paragraph>{pupilClass?.importedSchoolClass?.id}</Paragraph>
                            </TableCell>
                            <TableCell>
                                <Paragraph>
                                    {pupilClass?.importedSchoolClass?.yearGroup?.year !== 'Unknown' ? pupilClass?.yearGroup?.year : '-'}
                                </Paragraph>
                            </TableCell>
                            <TableCell>
                                <Paragraph>{pupilClass?.isRegistrationClass ? 'Registration class' : '-'}</Paragraph>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </CommonTable>
        </div>
    );
};

MisLinkedPupilTable.propTypes = {
    pupil: PropTypes.object
};

export default MisLinkedPupilTable;
