import { gql, useMutation, useQuery } from '@apollo/client';
import { Collapse, Divider, Grid } from '@mui/material';
import { Box } from '@mui/system';
import { Formik } from 'formik';
import { useContext, useEffect, useMemo } from 'react';

import {
    getAllYearGroups,
    getPreAdmissionClasses,
    getSchoolClassesAndGroups,
    getSchoolForDashboardWrapper,
    getSchoolForSchoolOverviewPage,
    getSchoolPupilsWithoutClasses
} from '../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { addPupilsInClassValidation } from '../../../shared/validations';
import { ILwpSchoolClass } from '../../../types/entities/ILwpSchoolClass';
import CommonLoading from '../../Shared/CommonLoading';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonSelectField from '../../Shared/CommonSelectField';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

const getSchoolClassesForUnassignedPupils = gql`
    query getSchoolClassesForUnassignedPupils($schoolId: String!, $isPreRegistrationClass: Boolean!) {
        getSchoolClassesForUnassignedPupils(schoolId: $schoolId, isPreRegistrationClass: $isPreRegistrationClass) {
            id
            name
            yearGroup {
                year
            }
        }
    }
`;

const assignPupilToNewOrExistingClass = gql`
    mutation assignPupilToNewOrExistingClass($input: AssignPupilToNewOrExistingClassInput!) {
        assignPupilToNewOrExistingClass(input: $input)
    }
`;

const NEW_CLASS = 'NEW_CLASS';

interface AddPupilsInClassProps {
    open: boolean;
    handleClose: () => void;
    schoolId: string;
    isPreRegistrationClass: boolean;
    selectedPupils: string[];
}

const AddPupilsInClass = ({ open, handleClose, schoolId, isPreRegistrationClass, selectedPupils }: AddPupilsInClassProps) => {
    const { callSnackbar, token } = useContext(ThemeContext);

    const { data, loading, error } = useQuery(getSchoolClassesForUnassignedPupils, {
        variables: {
            schoolId,
            isPreRegistrationClass
        }
    });

    const [addPupilsToNewOrExistingClass, { loading: addPupilsLoading }] = useMutation(assignPupilToNewOrExistingClass);

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);

    useEffect(() => {
        if (error?.message) handleErrorSnackbar(callSnackbar, error);

        if (yearGroupError?.message) handleErrorSnackbar(callSnackbar, yearGroupError);
    }, [error, yearGroupError]);

    const schoolClassesOptions = useMemo(() => {
        const schoolClasses: { value: string; id: string }[] = (data?.getSchoolClassesForUnassignedPupils || []).map(
            (item: ILwpSchoolClass) => ({
                value: `${item.name}${item?.yearGroup?.year ? ` (${item?.yearGroup?.year})` : ''}`,
                id: item.id
            })
        );

        if (isPreRegistrationClass) schoolClasses.unshift({ id: '', value: NEW_CLASS });

        return schoolClasses;
    }, [data?.getSchoolClassesForUnassignedPupils]);

    return (
        <Formik
            validationSchema={addPupilsInClassValidation}
            initialValues={{
                class: null,
                className: '',
                yearGroup: '',
                isCreateNewClass: false
            }}
            onSubmit={async (values) => {
                try {
                    const input: {
                        schoolId: string;
                        pupilIds: string[];
                        className?: string;
                        yearGroup?: string;
                        existingClassId?: string;
                    } = {
                        schoolId,
                        pupilIds: selectedPupils
                    };

                    if (values.isCreateNewClass) {
                        input.className = values.className;
                        input.yearGroup = values.yearGroup;
                    } else {
                        input.existingClassId = values.class?.id;
                    }

                    await addPupilsToNewOrExistingClass({
                        variables: {
                            input
                        },
                        refetchQueries: [
                            {
                                query: getSchoolPupilsWithoutClasses,
                                variables: {
                                    schoolId,
                                    isPreRegistrationPupils: isPreRegistrationClass
                                }
                            },
                            {
                                query: getSchoolClassesAndGroups,
                                variables: { schoolId, myClasses: true }
                            },
                            token?.isSchoolLeader && {
                                query: getSchoolClassesAndGroups,
                                variables: { schoolId, myClasses: false }
                            },
                            {
                                query: getPreAdmissionClasses,
                                variables: { schoolId }
                            },
                            {
                                query: getSchoolForSchoolOverviewPage,
                                variables: {
                                    id: schoolId
                                }
                            },
                            {
                                query: getSchoolForDashboardWrapper,
                                variables: {
                                    id: schoolId
                                }
                            }
                        ],
                        awaitRefetchQueries: true
                    });

                    callSnackbar('Pupils added to class successfully', 'success');
                    handleClose();
                } catch (error) {
                    callSnackbar(error, 'error');
                }
            }}>
            {({ values, handleChange, handleBlur, errors, touched, setFieldValue, handleSubmit }) => (
                <DialogWrapper
                    open={open}
                    setOpen={() => !addPupilsLoading && handleClose()}
                    cancelBtn
                    dialogFooter
                    heading={'Add to a class'}
                    primaryBtnHandler={handleSubmit}
                    primaryBtnDisabled={!values.class}
                    primaryBtnText={'Add to class'}
                    primaryBtnloading={addPupilsLoading}
                    contentWidth="550px">
                    {loading ? (
                        <CommonLoading />
                    ) : (
                        <Grid container>
                            {!values?.isCreateNewClass ? (
                                <CommonMultiSelect
                                    name="class"
                                    label="Class name"
                                    value={values.class}
                                    shrink={values.class}
                                    multiple={false}
                                    options={schoolClassesOptions}
                                    filterSelectedOptions={false}
                                    renderOption={(props, option) => {
                                        if (option?.value === NEW_CLASS) {
                                            return (
                                                <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                                    <Grid container gap={1} alignItems={'center'} flexDirection={'column'}>
                                                        <Paragraph text="+ Create a new class" />
                                                        <Divider />
                                                    </Grid>
                                                </Box>
                                            );
                                        }

                                        return (
                                            <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                                <Paragraph text={option.value} />
                                            </Box>
                                        );
                                    }}
                                    onChange={(value) => {
                                        setFieldValue('isCreateNewClass', value?.value === NEW_CLASS);
                                        setFieldValue('class', value);
                                    }}
                                />
                            ) : null}

                            <Collapse in={values?.isCreateNewClass} unmountOnExit>
                                <Grid container>
                                    <Grid container justifyContent={'space-between'} mb={1}>
                                        <Heading3 text="Creating a new class" />
                                        <Paragraph
                                            text="Cancel"
                                            customClass="ul cp"
                                            onClick={() => {
                                                setFieldValue('isCreateNewClass', false);
                                                setFieldValue('class', null);
                                            }}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <InputField
                                            name="className"
                                            value={values.className}
                                            error={errors.className}
                                            touched={touched.className}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            label="Class name"
                                            xs={12}
                                            sm={12}
                                            md={12}
                                            lg={12}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <CommonSelectField
                                            xs={12}
                                            label={`Year group`}
                                            name="yearGroup"
                                            dataTest="select-year-group"
                                            value={values.yearGroup}
                                            error={errors.yearGroup}
                                            touched={touched.yearGroup}
                                            options={(yearGroups?.allYearGroup || []).map((item) => ({
                                                value: item.year,
                                                key: item.id
                                            }))}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                </Grid>
                            </Collapse>
                        </Grid>
                    )}
                </DialogWrapper>
            )}
        </Formik>
    );
};

export default AddPupilsInClass;
