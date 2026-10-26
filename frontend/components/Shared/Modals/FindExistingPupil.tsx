import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Paper, TableCell, TableRow, TextField } from '@mui/material';
import { Autocomplete } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';

import { addPupilsInClass } from '../../../graphQl/mutations';
import {
    getActivityGridDataForGroupAcrossClasses,
    getAllYearGroups,
    getClassPupilsForClassPupilsPage,
    getClassPupilsForRegisterTable,
    getParameterByKey,
    getSchoolPupils
} from '../../../graphQl/queries';
import { getPupilYearGroup, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonLoading from '../../Shared/CommonLoading';
import CommonTable from '../../Shared/CommonTable';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import DialogWrapper from '../../Shared/DialogWrapper';
import Paragraph from '../../Shared/Typography/Paragraph';

interface Pupil {
    id: string;
}

interface FindExistingPupilProps {
    open: boolean;
    setOpen: () => void;
    class_name?: string;
    classYear?: string;
    classId?: string | string[];
    classPupils?: Pupil[];
    schoolId?: string;
    schoolMIS?: string;
    onAddPupilClick: () => void;
}

const FindExistingPupil = ({
    open,
    setOpen,
    class_name,
    classYear,
    classId,
    classPupils,
    schoolId,
    schoolMIS,
    onAddPupilClick
}: FindExistingPupilProps) => {
    const [selectedPupils, setSelectedPupils] = useState([]);
    const [dropDownOpen, setDropDownOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [dropdownList, setDropdownList] = useState([]);

    const { callSnackbar } = useContext(ThemeContext);

    const [getSchoolPupilsQuery, { error: error, loading: loading, data, called }] = useLazyQuery(getSchoolPupils);

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups, { variables: { showHiddenYearGroup: true } });

    const [addPupilsInClassMutation, { loading: addPupilsInClassLoading }] = useMutation(addPupilsInClass, {
        refetchQueries: [
            { query: getClassPupilsForRegisterTable, variables: { id: classId } },
            { query: getActivityGridDataForGroupAcrossClasses, variables: { id: classId } },
            { query: getClassPupilsForClassPupilsPage, variables: { id: classId } }
        ],
        awaitRefetchQueries: true
    });

    const {
        loading: getParameterLoading,
        error: getParametersError,
        data: parameter
    } = useQuery(getParameterByKey, { variables: { key: 'PARENT_SUPPORT_EMAIL' } });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }

        if (getParametersError?.message) {
            callSnackbar(getParametersError, 'error');
        }

        if (yearGroupError?.message) {
            callSnackbar(yearGroupError, 'error');
        }
    }, [yearGroupError, getParametersError, error]);

    useEffect(() => {
        if (dropDownOpen && searchValue) {
            getSchoolPupilsQuery({
                variables: {
                    schoolId,
                    pupilName: searchValue,
                    isSchoolMIS: !!schoolMIS
                }
            });
        }
    }, [dropDownOpen, searchValue]);

    const _onDeletePupil = (index) => {
        const newArr = [...selectedPupils];

        newArr.splice(index, 1);
        setSelectedPupils(newArr);
    };

    useEffect(() => {
        if (data?.getSchoolPupils && classPupils) {
            const filterExistingPupilInClass = data?.getSchoolPupils.filter(
                (schoolPupil) => !classPupils.map((classPupil) => classPupil.id).includes(schoolPupil.id)
            );
            const filterSeletedPupilInClass = filterExistingPupilInClass.filter(
                (existingPupil) => !selectedPupils.map((selectedPupil) => selectedPupil.id).includes(existingPupil.id)
            );

            setDropdownList(filterSeletedPupilInClass);
        }
    }, [data?.getSchoolPupils, classPupils, selectedPupils]);

    const head = [
        'Pupil name',
        {
            label: 'Registration class',
            icon: (
                <CommonTooltipIcon
                    text="The class the pupil is associated with in the Learning with Parents site, for this academic year."
                    customIconClass={'Icon'}
                />
            )
        },
        'Year group',
        'Action'
    ];

    const pupilType = (id) => Number.isInteger(parseFloat(id));

    if (getParameterLoading) return <CommonLoading />;

    return (
        <DialogWrapper
            className="edit-class-detail-modal"
            heading={'Add pupils to class'}
            open={open}
            setOpen={setOpen}
            contentWidth="865px"
            cancelBtn
            dialogFooter
            primaryBtnText="Add pupils"
            primaryBtnloading={addPupilsInClassLoading}
            primaryBtnDisabled={!selectedPupils.length || addPupilsInClassLoading}
            primaryBtnHandler={() => {
                addPupilsInClassMutation({ variables: { classId, pupilIds: selectedPupils.map((pupil) => pupil.id) } })
                    .then(() => {
                        setOpen();
                        callSnackbar('Added pupils successfully', 'success');
                    })
                    .catch((error) => callSnackbar(error, 'error'));
            }}>
            <Paragraph text={`${class_name} . ${classYear}`} />
            <Paragraph text="Please enter the name of the pupil you wish to add." customClass="my6" />
            <Autocomplete
                className="my6"
                id="combo-box-demo"
                options={dropdownList}
                loading={loading}
                loadingText={loading}
                onChange={(_, value) => value && setSelectedPupils((selectedPupils) => [...selectedPupils, value])}
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
                        label="Search"
                        variant="outlined"
                        color="primary"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <React.Fragment>
                                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
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
            <Paper>
                <CommonTable head={head} pagination={false}>
                    {selectedPupils.map((pupil, index) => (
                        <TableRow key={pupil?.id}>
                            <TableCell>
                                <Paragraph text={pupil?.fullname} />
                            </TableCell>
                            <TableCell>
                                <Paragraph
                                    text={
                                        pupil?.currentClass?.name
                                            ? pupil?.currentClass?.name
                                            : pupilType(pupil?.id)
                                              ? 'None assigned'
                                              : 'Not added yet'
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <Paragraph text={getPupilYearGroup(yearGroups?.allYearGroup, pupil?.yearGroup)} />
                            </TableCell>
                            <TableCell>
                                <CommonIconButton onClick={() => _onDeletePupil(index)} icon="close" toolTipTitle="Delete" />
                            </TableCell>
                        </TableRow>
                    ))}
                </CommonTable>
            </Paper>

            <br />
            <Paragraph>
                Pupil not on the list?{' '}
                <span className="cursor-pointer underline" onClick={onAddPupilClick} data-test="create-pupil-link">
                    Create a pupil here
                </span>
            </Paragraph>

            <br />
            <br />
            {dropdownList.length === 0 && schoolMIS && called && !loading && (
                <Paragraph>
                    Please note that new pupils may take up to a week to show in this list after they are added to {schoolMIS}. If you still
                    can&apos;t find the pupil in the list, please
                    <Link passHref href={`mailto:${parameter?.getParameterByKey?.value}`} target="_blank">
                        <span className="normal-link">contact us</span>
                    </Link>
                    .
                </Paragraph>
            )}
        </DialogWrapper>
    );
};

FindExistingPupil.defaultProps = {
    open: false,
    setOpen: () => {}
};

export default FindExistingPupil;
