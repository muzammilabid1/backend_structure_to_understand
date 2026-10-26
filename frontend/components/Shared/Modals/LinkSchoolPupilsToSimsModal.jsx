import { useMutation } from '@apollo/client';
import { IconButton, TableCell, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Autocomplete } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { linkPupilToWondePupil } from '../../../graphQl/mutations';
import {
    getClassPupilsForTeacher,
    getSchoolClassWithImportedStudents,
    getSchoolForSchoolDetailsForTeacher,
    getSchoolPupilsWithoutMIS
} from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const LinkSchoolPupilsToSimsModal = ({
    toggle,
    lwpPupils,
    importedStudents,
    subHeading,
    schoolMisIntegrationVariable,
    classId,
    schoolId,
    isLinking,
    setPupilToLink
}) => {
    const queryParams = useParams();
    let [selectedValue, setSelectedValue] = useState([]);
    const [linkPupilToWondePupilMutation, { loading: linkPupilToWondePupilLoading }] = useMutation(linkPupilToWondePupil);

    const refetchQueries = isLinking
        ? [
              {
                  query: getSchoolPupilsWithoutMIS,
                  variables: { schoolId }
              },
              {
                  query: getSchoolForSchoolDetailsForTeacher,
                  variables: { id: schoolId }
              }
          ]
        : [
              {
                  query: getClassPupilsForTeacher,
                  variables: { classId }
              },
              {
                  query: getSchoolClassWithImportedStudents,
                  variables: { id: queryParams?.class_id }
              }
          ];

    const { callSnackbar } = useContext(ThemeContext);

    const LightTooltip = withStyles((theme) => ({
        tooltip: {
            backgroundColor: theme.palette.common.white,
            color: 'rgba(0, 0, 0, 0.87)',
            boxShadow: theme.shadows[1],
            fontSize: 11
        }
    }))(Tooltip);

    const head = ['Pupil name', '', `Student profile in ${schoolMisIntegrationVariable}`, ''];

    useEffect(() => {
        const initialValues = lwpPupils
            ?.filter((lwpPupil) => !lwpPupil?.importedStudent?.id)
            ?.map((item) => {
                return { importedStudentId: item.importedStudent?.id, lwpPupilId: item.id, lwpPupilName: item.fullname };
            });

        importedStudents?.map((ws) =>
            initialValues?.map((v) => {
                if (!v.importedStudentId && `${ws.forename.toLowerCase()} ${ws.surname.toLowerCase()}` === v.lwpPupilName.toLowerCase()) {
                    v.importedStudentId = ws.id;
                }
            })
        );

        setSelectedValue(initialValues);
    }, [lwpPupils]);

    const _onSubmit = () => {
        const linkPupilInputs = selectedValue
            .filter((item) => item.importedStudentId && item.lwpPupilId)
            .map((i) => ({
                importedStudentId: i.importedStudentId,
                lwpPupilId: i.lwpPupilId
            }));

        linkPupilToWondePupilMutation({
            variables: { input: { linkPupilInputs } },
            refetchQueries,
            awaitRefetchQueries: true
        })
            .then(() => {
                toggle();
                if (setPupilToLink) setPupilToLink();
                callSnackbar(`${!isLinking ? 'Pupils' : 'Pupil'} has been linked to ${schoolMisIntegrationVariable}`, 'success');
            })
            .catch(({ ...err }) => {
                toggle();
                if (setPupilToLink) setPupilToLink();
                callSnackbar(err, 'error');
            });
    };

    const _onChange = (value, lwpPupil) => {
        const itemIndex = selectedValue.findIndex((i) => i.lwpPupilId === lwpPupil?.id);
        const newArr = [...selectedValue];

        newArr.splice(itemIndex, 1, {
            importedStudentId: value?.id ?? 'not_in_mis',
            lwpPupilId: lwpPupil?.id,
            lwpPupilName: lwpPupil?.fullname
        });
        setSelectedValue(newArr);
    };

    const _getSelectedValue = (lwpPupil) => {
        const item = selectedValue.find((i) => i.lwpPupilId === lwpPupil?.id);

        if (!item) return { value: `Not in ${schoolMisIntegrationVariable}`, id: 'not_in_mis' };

        const importedStudent = importedStudents.find((ws) => ws.id === item.importedStudentId);

        return !importedStudent
            ? { value: `Not in ${schoolMisIntegrationVariable}`, id: 'not_in_mis' }
            : {
                  value: `${importedStudent?.forename} ${importedStudent?.surname} (Year ${importedStudent?.importedClassYearGroup} - ${importedStudent?.importedClassName})`,
                  id: importedStudent?.id
              };
    };

    const _getSelectedStudent = (lwpPupil) => {
        const item = selectedValue.find((i) => i.lwpPupilId === lwpPupil?.id);

        if (!item) return null;

        const importedStudent = importedStudents.find((ws) => ws.id === item.importedStudentId);

        return importedStudent ? importedStudent : null;
    };

    return (
        <DialogWrapper
            className="link-pupils-to-mis"
            primaryBtnHandler={_onSubmit}
            onClose={toggle}
            heading={`Link pupils to ${schoolMisIntegrationVariable}`}
            subHeading={subHeading}
            primaryBtnloading={linkPupilToWondePupilLoading}
            dialogFooter
            contentWidth="900px"
            open={open}
            setOpen={toggle}
            primaryBtnText={'Link pupils'}
            cancelBtn>
            <CommonTable head={head}>
                {(lwpPupils || [])
                    ?.filter((lwpPupil) => !lwpPupil?.importedStudent?.id)
                    ?.map((lwpPupil, index) => (
                        <TableRow key={lwpPupil.id}>
                            <TableCell>
                                <Paragraph text={lwpPupil?.fullname} />
                            </TableCell>
                            <TableCell align="center">
                                <LightTooltip
                                    title={
                                        <React.Fragment>
                                            {lwpPupil?.classes?.length > 0 && <Typography variant="subtitle2">{'Classes: '}</Typography>}
                                            {(lwpPupil?.classes || []).map((c) => (
                                                <Typography variant="caption">{`${c?.yearGroup?.year} - ${c?.name}`}</Typography>
                                            ))}
                                            {lwpPupil?.parents?.length > 0 && <Typography variant="subtitle2">{'Parents: '}</Typography>}
                                            {(lwpPupil?.parents || []).map((p, idx) => (
                                                <div>
                                                    <Typography variant="caption">{`${idx + 1}- ${p?.firstname} ${p?.lastname} (${
                                                        p?.email ?? '-'
                                                    }, ${p?.phoneNumber ?? '-'})`}</Typography>
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    }>
                                    <IconButton aria-label="icon" disabled={false} size="large">
                                        <span className={`material-icons misInfoIcon `}>{'info_outlined'}</span>
                                    </IconButton>
                                </LightTooltip>
                            </TableCell>
                            {/* <TableCell colSpan={1} /> */}
                            <TableCell>
                                <Autocomplete
                                    id={`link-student-to-sims-${index}`}
                                    options={(importedStudents || [])
                                        .map((i) => ({
                                            value: `${i?.forename} ${i?.surname} (Year ${i?.importedClassYearGroup} - ${i?.importedClassName})`,
                                            id: i?.id
                                        }))
                                        .concat([{ value: `Not in ${schoolMisIntegrationVariable}`, id: 'not_in_mis' }])}
                                    onChange={(_, value) => _onChange(value, lwpPupil)}
                                    value={_getSelectedValue(lwpPupil)}
                                    disableClearable={true}
                                    getOptionLabel={(option) => option?.value}
                                    style={{ paddingTop: 10 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={`Select pupils in ${schoolMisIntegrationVariable}`}
                                            variant="outlined"
                                        />
                                    )}
                                />
                            </TableCell>
                            {/* <TableCell colSpan={1} /> */}
                            <TableCell align="center">
                                <LightTooltip
                                    title={
                                        <React.Fragment>
                                            {!_getSelectedStudent(lwpPupil) ? (
                                                <Typography variant="subtitle2">Please select a student profile.</Typography>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle2">{'Classes'}</Typography>
                                                    <Typography variant="caption">{`Year ${
                                                        _getSelectedStudent(lwpPupil)?.importedClassYearGroup
                                                    } - ${_getSelectedStudent(lwpPupil)?.importedClassName}`}</Typography>
                                                    {_getSelectedStudent(lwpPupil).importedContacts?.length > 0 && (
                                                        <Typography variant="subtitle2">{'Parents: '}</Typography>
                                                    )}
                                                    {(_getSelectedStudent(lwpPupil).importedContacts || []).map((p, idx) => (
                                                        <div>
                                                            <Typography variant="caption">{`
                                                        ${idx + 1}- ${p?.forename} ${p?.surname} (${p?.email ?? '-'}, ${
                                                            p?.phoneNumber ?? '-'
                                                        })`}</Typography>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </React.Fragment>
                                    }>
                                    <IconButton aria-label="icon" size="" disabled={false}>
                                        <span className={`material-icons misInfoIcon `}>{'info_outlined'}</span>
                                    </IconButton>
                                </LightTooltip>
                            </TableCell>
                        </TableRow>
                    ))}
            </CommonTable>
        </DialogWrapper>
    );
};

LinkSchoolPupilsToSimsModal.propTypes = {
    toggle: PropTypes.func.isRequired,
    lwpPupils: PropTypes.array.isRequired,
    importedStudents: PropTypes.array.isRequired,
    subHeading: PropTypes.string.isRequired,
    schoolMisIntegrationVariable: PropTypes.string.isRequired,
    classId: PropTypes.number,
    schoolId: PropTypes.number,
    isLinking: PropTypes.bool,
    setPupilToLink: PropTypes.func
};

export default LinkSchoolPupilsToSimsModal;
