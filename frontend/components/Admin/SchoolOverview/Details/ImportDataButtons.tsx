/* eslint-disable @typescript-eslint/no-explicit-any */
import { TableCell, TableRow } from '@mui/material';
import React from 'react';

import { ILwpSchool } from '../../../../types/entities/ILwpSchool';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonTable from '../../../Shared/CommonTable';
import Divider from '../../../Shared/Divider';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';

interface ParentChange {
    pupilName: string;
    lwpNames: string[];
    lwpEmails: string[];
    lwpPhones: string[];
    importedNames: string[];
    importedEmails: string[];
    importedPhones: string[];
}

interface MissedMatch {
    0: string;
    1: string;
}

interface CheckedImportedSchoolData {
    checkImportedSchoolData: { parentChanges: ParentChange[]; missedMatches: MissedMatch[] } | null;
}

interface ImportDataButtonsProps {
    setLinkPupilToMisModal: (value: boolean) => void;
    misName: string;
    linkPupilToMisModal: boolean;
    pullWondeSchoolDataLoading: boolean;
    schoolData: { getSchool: ILwpSchool };
    disPlayMisName: string;
    setlinkClassesModal: (value: boolean) => void;
    linkClassesModal: boolean;
    reimportCachedDataMutation: (options: { variables: { lwpSchoolId: string; wondeSchoolId: string } }) => Promise<void>;
    schoolId: string;
    wondeSchoolId: string;
    refetchSchoolStatus: any;
    reimportCachedDataLoading: boolean;
    checkImportedSchoolDataQuery: (options: { variables: { lwpSchoolId: string } }) => Promise<void>;
    checkImportedSchoolDataLoading: boolean;
    checkedImportedSchoolData: CheckedImportedSchoolData | null;
    isCSVAndActive: boolean;
    doPromoteProposedSchool: () => void;
    setRemoveWondeDataConfirmation: (value: boolean) => void;
    promoteProposedSchoolLoading: boolean;
    removeWondeDataConfirmation: boolean;
}

const ImportDataButtons = ({
    schoolData,
    pullWondeSchoolDataLoading,
    disPlayMisName,
    setlinkClassesModal,
    linkClassesModal,
    reimportCachedDataMutation,
    schoolId,
    wondeSchoolId,
    refetchSchoolStatus,
    reimportCachedDataLoading,
    checkImportedSchoolDataQuery,
    checkImportedSchoolDataLoading,
    checkedImportedSchoolData,
    isCSVAndActive,
    doPromoteProposedSchool,
    setRemoveWondeDataConfirmation,
    promoteProposedSchoolLoading,
    removeWondeDataConfirmation
}: ImportDataButtonsProps) => {
    return (
        <>
            {(schoolData?.['getSchool']?.misName !== null || pullWondeSchoolDataLoading) && (
                <>
                    <br />
                    <div className="import_class_links">
                        <Paragraph
                            customClass="mb-10"
                            text={`If classes already exist, link the ${disPlayMisName} classes to those in LwP.`}
                        />
                        <LWPButton
                            customClass="mb-10"
                            btnText={'Link Classes'}
                            disabled={pullWondeSchoolDataLoading}
                            onClick={() => setlinkClassesModal(!linkClassesModal)}
                        />
                        <Divider customClass="mtb-20" />
                    </div>
                    <LWPButton
                        disabled={pullWondeSchoolDataLoading}
                        customClass="mb-10"
                        btnText={'Reimport cached data'}
                        onClick={() =>
                            reimportCachedDataMutation({
                                variables: {
                                    lwpSchoolId: schoolId,
                                    wondeSchoolId: wondeSchoolId
                                }
                            })
                                .then(refetchSchoolStatus())
                                .catch(refetchSchoolStatus(true))
                        }
                        loading={reimportCachedDataLoading}
                    />
                    <div>
                        <LWPButton
                            disabled={pullWondeSchoolDataLoading}
                            customClass="mb-10"
                            btnText={'Check imported school data'}
                            onClick={() =>
                                checkImportedSchoolDataQuery({
                                    variables: {
                                        lwpSchoolId: schoolId
                                    }
                                })
                            }
                            loading={checkImportedSchoolDataLoading}
                        />
                        {checkedImportedSchoolData?.checkImportedSchoolData && !checkImportedSchoolDataLoading && (
                            <>
                                {checkedImportedSchoolData.checkImportedSchoolData?.parentChanges?.length ? (
                                    <div>
                                        <Heading3 text="Risk of incorrect match" />
                                        <CommonTable head={['Pupil name', 'Current parent details', 'Proposed parent details']}>
                                            {checkedImportedSchoolData.checkImportedSchoolData.parentChanges.map((change, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Paragraph text={change.pupilName} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <CommonTable head={['Name', 'Email', 'Phone']}>
                                                            {change.lwpNames.map((name, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell>
                                                                        <Paragraph text={name} />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Paragraph text={change.lwpEmails[index]} />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Paragraph text={change.lwpPhones[index]} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </CommonTable>
                                                    </TableCell>
                                                    <TableCell>
                                                        <CommonTable head={['Name', 'Email', 'Phone']}>
                                                            {change.importedNames.map((name, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell>
                                                                        <Paragraph text={name} />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Paragraph text={change.importedEmails[index]} />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Paragraph text={change.importedPhones[index]} />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </CommonTable>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </CommonTable>
                                    </div>
                                ) : (
                                    <p>Parent data looks OK!</p>
                                )}
                                {checkedImportedSchoolData.checkImportedSchoolData?.missedMatches?.length ? (
                                    <div>
                                        <Heading3 text="Risk of missing a match" />
                                        <CommonTable head={['Current name', 'Imported name']}>
                                            {checkedImportedSchoolData.checkImportedSchoolData.missedMatches.map((match, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Paragraph text={match[0]} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Paragraph text={match[1]} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </CommonTable>
                                    </div>
                                ) : (
                                    <p>No missed matches!</p>
                                )}
                            </>
                        )}
                        <br />
                        {isCSVAndActive ? (
                            <LWPButton
                                disabled={pullWondeSchoolDataLoading}
                                customClass="mb-10"
                                btnText={'Promote proposed school and delete existing school'}
                                onClick={doPromoteProposedSchool}
                                loading={promoteProposedSchoolLoading}
                            />
                        ) : null}
                    </div>
                    <div className="remove_imported_data">
                        <LWPButton
                            disabled={pullWondeSchoolDataLoading}
                            customClass="mb-10"
                            btnText={`Remove ${disPlayMisName} Data`}
                            onClick={() => setRemoveWondeDataConfirmation(!removeWondeDataConfirmation)}
                            loading={false}
                        />
                        <Divider customClass="mtb-20" />
                    </div>
                </>
            )}
        </>
    );
};

export default ImportDataButtons;
