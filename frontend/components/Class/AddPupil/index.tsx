import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid, Paper, TableCell, TableRow } from '@mui/material';
import { Form, Formik } from 'formik';
import { Gender } from 'lwp-shared/enums/Gender';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { getClassPupilsForAdmin } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, convertEnumIntoMUISelectOptions, handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { addPupilToASchoolClassValidation } from '../../../shared/validations';
import { ILwpSchoolClass } from '../../../types/entities/ILwpSchoolClass';
import { IStaticLwpYearGroup } from '../../../types/entities/IStaticLwpYearGroup';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonError from '../../Shared/CommonError';
import CommonLoading from '../../Shared/CommonLoading';
import CommonSelectField from '../../Shared/CommonSelectField';
import CommonStatus from '../../Shared/CommonStatus';
import CommonTable from '../../Shared/CommonTable';
import DateField from '../../Shared/InputField/DateField';
import InputField from '../../Shared/InputField/InputField';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import AddOrUpdateParentModal from './AddOrUpdateParentModal';

const GET_SCHOOL_CLASS = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            period {
                index
                shortName
            }
        }
    }
`;

const GET_ALL_YEAR_GROUPS = gql`
    query allYearGroup($showHiddenYearGroup: Boolean) {
        allYearGroup(showHiddenYearGroup: $showHiddenYearGroup) {
            id
            year
            shortName
        }
    }
`;

const INVITE_PARENTS_WITH_PUPIL = gql`
    mutation inviteParentsWithPupil($input: InviteParentsWithPupil!) {
        inviteParentsWithPupil(input: $input)
    }
`;

export type ParentDetails = {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
};

type AddPupilToAClassValues = {
    firstName: string;
    lastName: string;
    upn: string;
    gender: string;
    dateOfBirth: Date;
    yearGroup: string;
    isPupilPremium: string;
    parentDetails: ParentDetails[];
    isUpnNotAvailable: boolean;
};

interface AddPupilToASchoolClassProps {
    isAdminSide?: boolean;
    setOpen?: (open: boolean) => void;
}

const AddPupilToASchoolClass: React.FC<AddPupilToASchoolClassProps> = ({ isAdminSide = false, setOpen = () => {} }) => {
    const [addOrUpdateParentModal, setAddOrUpdateParentModal] = useState<{ open: boolean; parentDetail: ParentDetails }>({
        open: false,
        parentDetail: null
    });
    const [parentToRemove, setParentToRemove] = useState<{ open: boolean; parentId: string }>({ open: false, parentId: null });
    const { callSnackbar } = useContext(ThemeContext);
    const { query, isReady, push } = useRouter();
    const { class_id } = query;

    const {
        loading: schoolClassLoading,
        data: schoolClassData,
        error: schoolClassError
    } = useQuery(GET_SCHOOL_CLASS, {
        variables: { id: class_id },
        skip: !isReady
    });

    const {
        data: yearGroupsData,
        loading: yearGroupsLoading,
        error: yearGroupsError
    } = useQuery(GET_ALL_YEAR_GROUPS, {
        variables: { showHiddenYearGroup: false },
        skip: !isReady
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, schoolClassError);
        handleErrorSnackbar(callSnackbar, yearGroupsError);
    }, [schoolClassError, yearGroupsError]);

    const [inviteParentsWithPupilMutation, { loading: inviteParentsWithPupilLoading }] = useMutation(
        INVITE_PARENTS_WITH_PUPIL,
        isAdminSide
            ? {
                  refetchQueries: [{ query: getClassPupilsForAdmin, variables: { classId: class_id } }],
                  awaitRefetchQueries: true
              }
            : {}
    );

    const schoolClass: ILwpSchoolClass | null = useMemo(() => schoolClassData?.schoolClass, [schoolClassData?.schoolClass]);
    const yearGroups: IStaticLwpYearGroup[] | null = useMemo(() => yearGroupsData?.allYearGroup, [yearGroupsData?.allYearGroup]);
    const addPupilToAClassInitialValues: AddPupilToAClassValues = {
        firstName: '',
        lastName: '',
        upn: '',
        gender: null,
        dateOfBirth: null,
        yearGroup: '',
        isPupilPremium: null,
        parentDetails: [],
        isUpnNotAvailable: false
    };

    const handleCancel = () => {
        if (isAdminSide) {
            setOpen(false);
        } else {
            push(`/class/${class_id}/pupils`);
        }
    };

    if (schoolClassLoading || yearGroupsLoading) return <CommonLoading />;

    return (
        <Grid container direction="column" spacing={2} className="add-pupil-to-school-class">
            {!isAdminSide ? (
                <Grid item>
                    <LWPButton
                        btnText="Go back"
                        startIcon="navigate_before"
                        color="inherit"
                        variant="text"
                        size="medium"
                        onClick={() => push(`/class/${class_id}/pupils`)}
                    />
                </Grid>
            ) : null}
            <Grid item>
                <CommonStatus
                    heading={`Add a pupil to ${schoolClass?.name}`}
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala_activate_teacher.png`}
                    className="mb5"
                />
            </Grid>
            <Grid item>
                <Formik
                    validationSchema={addPupilToASchoolClassValidation}
                    initialValues={addPupilToAClassInitialValues}
                    onSubmit={async (values: AddPupilToAClassValues) => {
                        try {
                            const { firstName, lastName, upn, gender, dateOfBirth, yearGroup, isPupilPremium, parentDetails } = values;

                            const trimmedFirstName = _removeWhiteSpace(firstName);
                            const trimmedLastName = _removeWhiteSpace(lastName);
                            const trimmedUPN = _removeWhiteSpace(upn);

                            await inviteParentsWithPupilMutation({
                                variables: {
                                    input: {
                                        firstName: trimmedFirstName,
                                        lastName: trimmedLastName,
                                        upn: values.isUpnNotAvailable ? null : trimmedUPN,
                                        gender: gender,
                                        dateOfBirth: dateOfBirth,
                                        yearGroup: yearGroup,
                                        isPupilPremium: isPupilPremium === 'unknown' ? null : isPupilPremium === 'true',
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        parentDetails: parentDetails.map(({ id, ...rest }) => rest),
                                        classId: class_id
                                    }
                                }
                            });
                            callSnackbar('Pupil added.', 'success');
                            if (isAdminSide) {
                                setOpen(false);
                            } else {
                                push(`/class/${class_id}/pupils`);
                            }
                        } catch (error) {
                            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                            if (statusCode) {
                                callSnackbar(error, 'error');
                            } else {
                                window.newrelic?.noticeError(error, { caught: true, handled: false });
                                callSnackbar(unexpectedError, 'error');
                            }
                        }
                    }}>
                    {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue, setValues }) => {
                        return (
                            <Grid container direction="column" maxWidth={800} margin={'0 auto'} marginTop={2} spacing={2}>
                                <Form onSubmit={(e) => e.preventDefault()}>
                                    <InputField
                                        name="firstName"
                                        value={values.firstName}
                                        error={errors.firstName}
                                        touched={touched.firstName}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        label="First name"
                                        type="text"
                                        lg={12}
                                        md={12}
                                        sm={12}
                                        xs={12}
                                    />
                                    <InputField
                                        name="lastName"
                                        value={values.lastName}
                                        error={errors.lastName}
                                        touched={touched.lastName}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        label="Last name"
                                        type="text"
                                        lg={12}
                                        md={12}
                                        sm={12}
                                        xs={12}
                                    />
                                    <div className="add-pupil-upn-field">
                                        <InputField
                                            name="upn"
                                            value={values.upn}
                                            error={errors.upn}
                                            touched={touched.upn}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            label="UPN"
                                            type="text"
                                            lg={12}
                                            md={12}
                                            sm={12}
                                            xs={12}
                                            disabled={values.isUpnNotAvailable}
                                        />
                                        <CommonCheckBox
                                            label="This pupil does not have a UPN yet"
                                            name="isUpnNotAvailable"
                                            checked={values.isUpnNotAvailable}
                                            error={errors.isUpnNotAvailable}
                                            touched={touched.isUpnNotAvailable}
                                            onChange={(e) => {
                                                setValues({
                                                    ...values,
                                                    isUpnNotAvailable: e.target.checked,
                                                    upn: ''
                                                });
                                            }}
                                        />
                                    </div>

                                    <CommonSelectField
                                        label={'Gender'}
                                        options={convertEnumIntoMUISelectOptions(Gender)}
                                        value={values.gender}
                                        error={errors.gender}
                                        touched={touched.gender}
                                        onChange={(e) =>
                                            handleChange({
                                                target: { name: 'gender', value: e.target.value }
                                            })
                                        }
                                        onBlur={(e) =>
                                            handleBlur({
                                                target: { name: 'gender', value: e.target.value }
                                            })
                                        }
                                        lg={12}
                                        md={12}
                                        sm={12}
                                        xs={12}
                                        dataTest={'add-pupil-gender-select'}
                                    />

                                    <DateField
                                        name="dateOfBirth"
                                        label="Date of birth"
                                        value={values.dateOfBirth}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        touched={touched.dateOfBirth}
                                        error={errors.dateOfBirth}
                                        maxDate={new Date()}
                                        isGridRoot
                                        lg={12}
                                        md={12}
                                        sm={12}
                                        xs={12}
                                    />

                                    <CommonSelectField
                                        label={`Year group for ${schoolClass?.period?.shortName}`}
                                        options={(yearGroups || []).map((item: IStaticLwpYearGroup) => ({
                                            value: item.year,
                                            key: item.id
                                        }))}
                                        value={values.yearGroup}
                                        error={errors.yearGroup}
                                        touched={touched.yearGroup}
                                        onChange={(e) =>
                                            handleChange({
                                                target: { name: 'yearGroup', value: e.target.value }
                                            })
                                        }
                                        onBlur={(e) =>
                                            handleBlur({
                                                target: { name: 'yearGroup', value: e.target.value }
                                            })
                                        }
                                        lg={12}
                                        md={12}
                                        sm={12}
                                        xs={12}
                                        dataTest={'add-pupil-year-group-select'}
                                    />

                                    <CommonSelectField
                                        label={'Pupil premium'}
                                        options={[
                                            { value: 'Yes', key: 'true' },
                                            { value: 'No', key: 'false' },
                                            { value: 'Not known yet', key: 'unknown' }
                                        ]}
                                        value={values.isPupilPremium}
                                        error={errors.isPupilPremium}
                                        touched={touched.isPupilPremium}
                                        onChange={(e) =>
                                            handleChange({
                                                target: { name: 'isPupilPremium', value: e.target.value }
                                            })
                                        }
                                        onBlur={(e) =>
                                            handleBlur({
                                                target: { name: 'isPupilPremium', value: e.target.value }
                                            })
                                        }
                                        lg={12}
                                        md={12}
                                        sm={12}
                                        xs={12}
                                        dataTest={'add-pupil-isPremium-select'}
                                    />

                                    <Grid container direction="column" margin={'20px 0'}>
                                        <Grid
                                            container
                                            display={'flex'}
                                            justifyContent={'space-between'}
                                            alignItems={'center'}
                                            marginBottom={'10px'}>
                                            <Grid item>
                                                <Heading3 text="Parents' details" />
                                            </Grid>
                                            {values.parentDetails.length > 0 ? (
                                                <Grid item>
                                                    <LWPButton
                                                        btnText="Add more parents"
                                                        onClick={() => setAddOrUpdateParentModal({ open: true, parentDetail: null })}
                                                        color="inherit"
                                                        startIcon={'add'}
                                                        variant="text"
                                                        dataTest="add-more-parents-for-pupil-button"
                                                    />
                                                </Grid>
                                            ) : null}
                                        </Grid>
                                        <Grid item>
                                            {values.parentDetails.length === 0 ? (
                                                <Grid container>
                                                    <Paper
                                                        elevation={3}
                                                        style={{
                                                            padding: '10px',
                                                            width: '100%',
                                                            height: '120px',
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }}>
                                                        <LWPButton
                                                            btnText="Add first parent"
                                                            dataTest="add-first-parent-for-pupil-button"
                                                            onClick={() => setAddOrUpdateParentModal({ open: true, parentDetail: null })}
                                                        />
                                                    </Paper>
                                                </Grid>
                                            ) : (
                                                <Grid container>
                                                    <CommonTable head={['First name', 'Last name', 'Contact details', 'Actions']}>
                                                        {values.parentDetails?.map((parentDetail, index) => {
                                                            return (
                                                                <TableRow key={index}>
                                                                    <TableCell width={300}>
                                                                        <Paragraph
                                                                            isTruncate
                                                                            dontCapitilizeFirstLetter
                                                                            text={parentDetail?.firstname}
                                                                            dataTest={`parent-firstname`}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell width={300}>
                                                                        <Paragraph
                                                                            isTruncate
                                                                            dontCapitilizeFirstLetter
                                                                            text={parentDetail?.lastname}
                                                                            dataTest={`parent-lastname`}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell width={300}>
                                                                        <Paragraph
                                                                            isTruncate
                                                                            dontCapitilizeFirstLetter
                                                                            text={parentDetail?.email}
                                                                            dataTest={`parent-email`}
                                                                        />
                                                                        <Paragraph
                                                                            isTruncate
                                                                            dontCapitilizeFirstLetter
                                                                            text={parentDetail?.phoneNumber}
                                                                            dataTest={`parent-phoneNumber`}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell width={300}>
                                                                        <CommonIconButton
                                                                            toolTipTitle="Edit parent"
                                                                            dataTest={`edit-parent-button`}
                                                                            onClick={() =>
                                                                                setAddOrUpdateParentModal({
                                                                                    open: true,
                                                                                    parentDetail: parentDetail
                                                                                })
                                                                            }
                                                                            icon="edit"
                                                                        />
                                                                        <CommonIconButton
                                                                            toolTipTitle="Remove parent"
                                                                            dataTest={`remove-parent-button`}
                                                                            onClick={() =>
                                                                                setParentToRemove({ open: true, parentId: parentDetail.id })
                                                                            }
                                                                            icon="delete"
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </CommonTable>
                                                </Grid>
                                            )}
                                        </Grid>
                                        <Grid item>
                                            <CommonError error={errors.parentDetails} touched={touched.parentDetails} />
                                        </Grid>
                                    </Grid>

                                    <Grid container direction="row" justifyContent="flex-end" spacing={2}>
                                        <Grid item>
                                            <LWPButton btnText="Cancel" variant="text" onClick={handleCancel} color="inherit" />
                                        </Grid>
                                        <Grid item>
                                            <LWPButton
                                                dataTest="add-pupil-button"
                                                btnText="Add pupil"
                                                loading={inviteParentsWithPupilLoading}
                                                onClick={handleSubmit}
                                            />
                                        </Grid>
                                    </Grid>
                                    {addOrUpdateParentModal?.open && (
                                        <AddOrUpdateParentModal
                                            open={addOrUpdateParentModal?.open}
                                            setOpen={() => setAddOrUpdateParentModal({ open: false, parentDetail: null })}
                                            parentDetailsValue={values.parentDetails}
                                            setFieldValue={setFieldValue}
                                            valuesToUpdate={addOrUpdateParentModal.parentDetail}
                                        />
                                    )}
                                    {parentToRemove.open && (
                                        <ConfirmationModal
                                            open={parentToRemove.open}
                                            onCancel={() => setParentToRemove({ open: false, parentId: null })}
                                            heading="Remove parent from this pupil?"
                                            cancelBtn
                                            btnText="Remove"
                                            btnClass="delete-button"
                                            onConfirm={() => {
                                                setFieldValue(
                                                    'parentDetails',
                                                    values.parentDetails.filter((parent) => parent.id !== parentToRemove.parentId)
                                                );
                                                callSnackbar('Parent has been removed successfully.', 'success');
                                                setParentToRemove({ open: false, parentId: null });
                                            }}>
                                            Are you sure you want to remove this parent from this pupil?
                                        </ConfirmationModal>
                                    )}
                                </Form>
                            </Grid>
                        );
                    }}
                </Formik>
            </Grid>
        </Grid>
    );
};

export default AddPupilToASchoolClass;
