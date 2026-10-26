import { useMutation, useQuery } from '@apollo/client';
import { Autocomplete, TableCell, TableRow, TextField } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { linkPupilToWondePupil } from '../../../graphQl/mutations';
import { getImportedSchoolPupils, getPupilForTeacher } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const LinkPupilToSimsModal = ({
    toggle,
    open = false,
    pupil,
    subHeading,
    schoolMisIntegrationVariable,
    unlinkPupilFromMisModal = false
}) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [selectedValue, setSelectedValue] = useState([]);
    const [pupilValue, setPupilValue] = useState(null);

    const head = ['Pupil name', `Pupil profile in ${schoolMisIntegrationVariable}`];

    const { error: importedStudentsError, data: importedStudentsData } = useQuery(getImportedSchoolPupils, {
        variables: { id: pupil?.['pupil']?.school?.id }
    });

    useEffect(() => {
        importedStudentsError?.message && callSnackbar(importedStudentsError, 'error');
    }, [importedStudentsError]);

    const [linkPupilToWondePupilMutation, { loading: linkPupilToWondePupilLoading }] = useMutation(linkPupilToWondePupil, {
        refetchQueries: [
            {
                query: getPupilForTeacher,
                variables: { id: pupil?.['pupil']?.id }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        const initialValues = [
            {
                importedStudentId: pupil?.['pupil']?.importedStudent?.id,
                lwpPupilId: pupil?.['pupil']?.id,
                lwpPupilName: pupil?.['pupil']?.fullname
            }
        ];

        (importedStudentsData?.['getImportedSchoolPupils'] || [])?.map((ws) =>
            initialValues?.map((v) => {
                if (
                    !v.importedStudentId &&
                    v.lwpPupilName &&
                    ws.forename &&
                    ws.surname &&
                    `${ws.forename.toLowerCase()} ${ws.surname.toLowerCase()}` === v.lwpPupilName.toLowerCase()
                ) {
                    v.importedStudentId = ws.id;
                }
            })
        );
        setSelectedValue(initialValues);
    }, [pupil?.['pupil']]);

    useEffect(() => {
        if (importedStudentsData?.['getImportedSchoolPupils'])
            setPupilValue(
                importedStudentsData?.['getImportedSchoolPupils']?.find(
                    (item) => `${item.forename} ${item.surname}`.toLowerCase() === pupil?.pupil?.fullname?.toLowerCase()
                )
            );
    }, [importedStudentsData]);

    const _onSubmit = () => {
        const linkPupilInputs = selectedValue.map((i) => ({
            importedStudentId: pupil?.['pupil']?.importedStudent?.id ? 'not_in_mis' : pupilValue.id,
            lwpPupilId: i.lwpPupilId
        }));

        linkPupilToWondePupilMutation({
            variables: { input: { linkPupilInputs } }
        })
            .then(() => {
                callSnackbar(
                    `Pupil has been ${pupil?.['pupil']?.importedStudent?.id ? 'unlinked' : 'linked'} to ${
                        pupil?.['pupil']?.school?.misName
                    }`,
                    'success'
                );
                toggle(false);
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            });
    };

    const formattedData = importedStudentsData?.['getImportedSchoolPupils']?.map((item) => {
        return {
            groupBy: item?.forename?.toLowerCase() === pupil?.pupil?.firstname?.toLowerCase() ? 'Suggested Pupil' : 'Other Pupils',
            ...item
        };
    });

    const sortedData = formattedData?.sort((a, b) => {
        if (a?.groupBy === 'Suggested Pupil' && b?.groupBy === 'Other Pupils') {
            return -1;
        } else if (a.groupBy === 'Other Pupils' && b?.groupBy === 'Suggested Pupil') {
            return 1;
        } else {
            return 0;
        }
    });

    if (!open) return null;

    return (
        <DialogWrapper
            primaryBtnHandler={_onSubmit}
            onClose={toggle}
            heading={unlinkPupilFromMisModal ? 'Unlink this pupil?' : `Link pupils to ${schoolMisIntegrationVariable}`}
            subHeading={subHeading}
            primaryBtnloading={linkPupilToWondePupilLoading}
            dialogFooter
            contentWidth="768px"
            open={open}
            setOpen={toggle}
            primaryBtnText={unlinkPupilFromMisModal ? 'Unlink pupil' : 'Link students '}
            cancelBtn>
            {unlinkPupilFromMisModal ? (
                <Paragraph>
                    Are you sure you want to unlink <b>{pupil?.pupil?.fullname}</b> from {schoolMisIntegrationVariable}?
                </Paragraph>
            ) : (
                <CommonTable head={head}>
                    <TableRow>
                        <TableCell>
                            <Paragraph text={pupil?.pupil?.fullname} />
                        </TableCell>
                        <TableCell>
                            <Autocomplete
                                options={sortedData}
                                renderOption={(value, option) => {
                                    return (
                                        <li {...value}>
                                            <div
                                                style={{ padding: '0 15px' }}
                                                className="cp"
                                                onClick={() => {
                                                    setPupilValue(option);
                                                }}>
                                                <div>
                                                    <Paragraph>{`${option?.forename} ${option?.surname}`}</Paragraph>
                                                </div>
                                                <div style={{ marginBottom: '8px' }}>
                                                    <Paragraph style={{ color: '#999591' }}>
                                                        {option?.importedClassName} - {option?.importedClassYearGroup}
                                                    </Paragraph>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                }}
                                renderGroup={({ group, children }) => {
                                    return (
                                        <>
                                            {group === 'Other Pupils' && (
                                                <hr style={{ borderTop: '1px solid #D6D1CB', margin: '8px 13px' }} />
                                            )}
                                            <Paragraph style={{ color: '#000', padding: '0 13px' }}>
                                                <b>{group}</b>
                                            </Paragraph>
                                            {children}
                                        </>
                                    );
                                }}
                                defaultValue={pupilValue}
                                groupBy={(option) => option?.groupBy}
                                getOptionLabel={(option) => option.forename + ' ' + option.surname}
                                renderInput={(params) => <TextField {...params} label="Search" variant="outlined" />}
                            />
                        </TableCell>
                    </TableRow>
                </CommonTable>
            )}
        </DialogWrapper>
    );
};

LinkPupilToSimsModal.propTypes = {
    toggle: PropTypes.func.isRequired,
    pupil: PropTypes.object,
    lwpPupils: PropTypes.array.isRequired,
    importedStudents: PropTypes.array.isRequired,
    subHeading: PropTypes.string.isRequired,
    schoolMisIntegrationVariable: PropTypes.string.isRequired,
    classId: PropTypes.number.isRequired,
    open: PropTypes.bool,
    unlinkPupilFromMisModal: PropTypes.bool
};

export default LinkPupilToSimsModal;
