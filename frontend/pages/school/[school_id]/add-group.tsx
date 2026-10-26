import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Autocomplete, TableCell, TableRow, TextField } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { Formik } from 'formik';
import { debounce } from 'lodash';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonMultiSelect from '../../../components/Shared/CommonMultiSelect';
import CommonSelectField from '../../../components/Shared/CommonSelectField';
import CommonStatus from '../../../components/Shared/CommonStatus';
import CommonTable from '../../../components/Shared/CommonTable';
import InputField from '../../../components/Shared/InputField/InputField';
import AddTeacherModal from '../../../components/Shared/Modals/AddTeacher';
import Heading3 from '../../../components/Shared/Typography/Heading3';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { getGroupsAcrossClasses, getPreAdmissionClasses, getSchoolClasses, getSchoolClassesAndGroups } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { AddGroupAcrossClassesValidation } from '../../../shared/validations';
import { PageType } from '../../../types/enums/PageType';

const getSchoolTeachersForAddGroupAcrossClasses = gql`
    query getSchoolTeachers($schoolId: String!) {
        getSchoolTeachers(schoolId: $schoolId) {
            id
            firstname
            lastname
        }
    }
`;

// A group across classes takes its licence from its pupils' registration classes, so only pupils
// who are in one can be added to it. isPupilsWithClasses filters them out in SQL, so there is
// nothing to filter here.
const getSchoolPupilsForAddGroupAcrossClasses = gql`
    query getSchoolPupils($schoolId: String!, $pupilName: String, $isPupilsWithClasses: Boolean) {
        getSchoolPupils(schoolId: $schoolId, pupilName: $pupilName, isPupilsWithClasses: $isPupilsWithClasses) {
            id
            fullname
        }
    }
`;

const getAllYearGroupsForAddGroupAcrossClasses = gql`
    query allYearGroup($showHiddenYearGroup: Boolean) {
        allYearGroup(showHiddenYearGroup: $showHiddenYearGroup) {
            id
            year
        }
    }
`;

const createGroupAcrossClasses = gql`
    mutation createGroupAcrossClasses($input: CreateGroupAcrossClassesInput!) {
        createGroupAcrossClasses(input: $input)
    }
`;

const AddGroupAcrossClasses = () => {
    const [open, setOpen] = useState(false);
    const [dropDownOpen, setDropDownOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [dropdownList, setDropdownList] = useState([]);
    const queryParams = useParams();
    const { push } = useRouter();
    const { callSnackbar, token } = useContext(ThemeContext);
    const schoolId: string = queryParams?.school_id?.toString() || '';
    const head = ['Pupil name', ''];

    const {
        loading: getSchoolTeachersLoading,
        error: getSchoolTeachersError,
        data: schoolTeachersData
    } = useQuery(getSchoolTeachersForAddGroupAcrossClasses, {
        variables: { schoolId }
    });

    const {
        loading: getAllYearGroupsLoading,
        error: yearGroupError,
        data: yearGroupsData
    } = useQuery(getAllYearGroupsForAddGroupAcrossClasses);

    const [getPupilsQuery, { loading: getPupilsLoading, error: getPupilsError }] = useLazyQuery(getSchoolPupilsForAddGroupAcrossClasses);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, getSchoolTeachersError);
        handleErrorSnackbar(callSnackbar, yearGroupError);
        handleErrorSnackbar(callSnackbar, getPupilsError);
    }, [getSchoolTeachersError, yearGroupError, getPupilsError]);

    const fetchSchoolPupilsQuery = debounce(async () => {
        const { data } = await getPupilsQuery({
            variables: {
                schoolId,
                pupilName: searchValue,
                isPupilsWithClasses: true
            }
        });

        setDropdownList(data?.getSchoolPupils || []);
    }, 500);

    useEffect(() => {
        if (dropDownOpen && searchValue) {
            fetchSchoolPupilsQuery();
        }
    }, [dropDownOpen, searchValue]);

    const getMainTeachers = (otherteachers) => {
        const schoolTeachersList = schoolTeachersData?.['getSchoolTeachers'] || [];

        const result = otherteachers.length
            ? schoolTeachersList.filter((i) => !otherteachers.some((j) => j.key === i.id))
            : schoolTeachersList;

        return result.map((teacher) => ({
            value: `${teacher.firstname} ${teacher.lastname}`,
            key: teacher.id
        }));
    };

    const getOtherTeachers = (mainTeacherId) => {
        const schoolTeachersList = schoolTeachersData?.['getSchoolTeachers'] || [];

        return schoolTeachersList
            .filter((teacher) => teacher.id !== mainTeacherId)
            .map((teacher) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id
            }));
    };

    const [createGroupAcrossClassesMutation, { loading }] = useMutation(createGroupAcrossClasses, {
        refetchQueries: [
            { query: getSchoolClasses, variables: { schoolId } },
            { query: getSchoolClassesAndGroups, variables: { schoolId, myClasses: true } },
            { query: getGroupsAcrossClasses, variables: { schoolId, myClasses: true } },
            token?.isSchoolLeader && {
                query: getSchoolClassesAndGroups,
                variables: { schoolId, myClasses: false }
            },
            token?.isSchoolLeader && {
                query: getGroupsAcrossClasses,
                variables: { schoolId, myClasses: false }
            },
            { query: getPreAdmissionClasses, variables: { schoolId } }
        ],
        awaitRefetchQueries: true
    });

    const handleOnSubmit = async (values) => {
        const { groupName, yearGroup, mainTeacher, otherteachers, addPupil } = values;

        try {
            const payload: Record<string, string> = {
                name: groupName,
                yearGroup,
                mainTeacher,
                teachers: (otherteachers || []).map((teacher) => teacher.key),
                schoolId,
                pupilIds: (addPupil || []).map((pupil) => pupil.id)
            };

            await createGroupAcrossClassesMutation({
                variables: {
                    input: payload
                }
            });

            push('/');
        } catch (error) {
            handleErrorSnackbar(callSnackbar, error);
            console.log('error:', error);
        }
    };

    if (getSchoolTeachersLoading || getAllYearGroupsLoading) return <CommonLoading />;

    return (
        <div className="individual_group">
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala_activate_teacher.png`}
                imageAlt={'teacher-img'}
                heading={'Create a new group'}
                className="main_heading"
            />

            <Formik
                initialValues={{
                    groupName: '',
                    mainTeacher: '',
                    yearGroup: '',
                    addPupil: [],
                    otherteachers: [],
                    searchPupil: []
                }}
                validationSchema={AddGroupAcrossClassesValidation}
                onSubmit={handleOnSubmit}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <div className="individual_group_form">
                        <Heading3 text={`Group details`} customClass="mb_16 mt_32" />
                        <InputField
                            label="Group name"
                            name="groupName"
                            type="text"
                            value={values.groupName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.groupName}
                            touched={touched.groupName}
                        />

                        <CommonSelectField
                            label="Year group"
                            name="yearGroup"
                            options={(yearGroupsData?.allYearGroup || []).map((item) => ({
                                value: item.year,
                                key: item.id.toString()
                            }))}
                            value={values.yearGroup}
                            error={errors.yearGroup}
                            touched={touched.yearGroup}
                            onChange={(e) => {
                                handleChange({
                                    target: { name: 'yearGroup', value: e.target.value }
                                });
                            }}
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'yearGroup', value: e.target.value }
                                })
                            }
                            dataTest="group-across-classes-yearGroup-select"
                        />

                        <Heading3 text="Add existing pupils to group" customClass="mt_32" />
                        <Paragraph text="Please select which existing pupils should be added to this group." customClass="mb_16" />
                        <div className="individual_group_search_pupil">
                            <Autocomplete
                                className="individual_group_search_pupil_input"
                                id="combo-box-demo"
                                options={dropdownList}
                                loading={loading || getPupilsLoading}
                                onChange={(_, value, reason) => {
                                    if (reason === 'clear') return;

                                    const uniqueArr = Array.from(new Map([...values.addPupil, ...[value]].map((v) => [v?.id, v])).values());

                                    handleChange({
                                        target: {
                                            name: 'addPupil',
                                            value: uniqueArr
                                        }
                                    });
                                }}
                                onInputChange={(_, value, reason) => {
                                    if (reason === 'reset') {
                                        setSearchValue('');

                                        return;
                                    } else {
                                        setSearchValue(value);
                                    }
                                }}
                                getOptionLabel={(option) => option.fullname}
                                clearOnEscape={true}
                                clearOnBlur={true}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Search for a pupil"
                                        variant="outlined"
                                        disabled={loading || getPupilsLoading}
                                        color="primary"
                                        name="group-across-classes-pupils-search-input"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {loading || getPupilsLoading ? (
                                                        <CircularProgress
                                                            data-test="group-across-classes-pupils-search-loading"
                                                            color="inherit"
                                                            size={20}
                                                        />
                                                    ) : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            )
                                        }}
                                    />
                                )}
                                inputValue={searchValue}
                                open={dropDownOpen}
                                onOpen={() => {
                                    setDropDownOpen(true);
                                }}
                                onClose={() => {
                                    setDropDownOpen(false);
                                }}
                            />
                        </div>
                        <CommonTable head={head} isChild={true} bold={false}>
                            {values?.addPupil.map((item) => {
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Paragraph>{`${item?.fullname}`}</Paragraph>
                                        </TableCell>

                                        <TableCell align="right">
                                            <div
                                                className="cp"
                                                onClick={() => {
                                                    const delteItem = values.addPupil?.filter((pupil) => pupil.id !== item.id);

                                                    handleChange({
                                                        target: {
                                                            name: 'addPupil',
                                                            value: delteItem
                                                        }
                                                    });
                                                }}>
                                                <span className="material-icons">delete</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </CommonTable>
                        <Heading3 text="Teachers" customClass="mt_32 mb_16" />
                        <CommonSelectField
                            label="Main  teacher"
                            name="mainTeacher"
                            options={getMainTeachers(values.otherteachers)}
                            value={values.mainTeacher}
                            error={errors.mainTeacher}
                            touched={touched.mainTeacher}
                            onChange={(e) => {
                                handleChange({
                                    target: { name: 'mainTeacher', value: e.target.value }
                                });
                            }}
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'mainTeacher', value: e.target.value }
                                })
                            }
                            dataTest="group-across-classes-main-teacher-select"
                        />
                        <CommonMultiSelect
                            label="Other teachers"
                            dataTest="group-across-classes-other-teachers-select"
                            name="otherteachers"
                            className="mb_24"
                            options={getOtherTeachers(values.mainTeacher)}
                            value={values.otherteachers}
                            error={errors.otherteachers}
                            touched={touched.otherteachers}
                            onChange={(value) => {
                                handleChange({
                                    target: { name: 'otherteachers', value: value }
                                });
                            }}
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'otherteachers', value: value }
                                })
                            }
                        />

                        {token?.isSchoolLeader && (
                            <div className={'addTeacherContainer'} onClick={() => setOpen(true)}>
                                <span className={'title'}>Add a teacher who isn’t registered with Learning with Parents</span>
                                <span className={`material-icons addBtn`}>add</span>
                            </div>
                        )}

                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                onClick={() => push('/')}
                                btnText="Cancel"
                                color="inherit"
                                disabled={loading}
                            />
                            <LWPButton
                                dataTest="group-across-classes-create-button"
                                btnText="Create group"
                                onClick={handleSubmit}
                                loading={loading}
                            />
                        </div>
                    </div>
                )}
            </Formik>

            {open && (
                <AddTeacherModal
                    open={open}
                    setOpen={() => setOpen(!open)}
                    schoolId={schoolId}
                    refetchQueries={{
                        query: getSchoolTeachersForAddGroupAcrossClasses,
                        variables: { schoolId }
                    }}
                />
            )}
        </div>
    );
};

AddGroupAcrossClasses.pageType = PageType.SCHOOL_LEADER;
AddGroupAcrossClasses.pageTitle = 'School: Add group';

export default AddGroupAcrossClasses;
