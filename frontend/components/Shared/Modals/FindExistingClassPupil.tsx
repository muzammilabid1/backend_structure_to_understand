import { DocumentNode, gql, TypedDocumentNode, useLazyQuery, useMutation } from '@apollo/client';
import { Paper, TableCell, TableRow, TextField } from '@mui/material';
import { Autocomplete } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { debounce } from 'lodash';
import React, { useContext, useEffect, useState } from 'react';

import { addPupilsInClass } from '../../../graphQl/mutations';
import {
    getActivityGridDataForGroupAcrossClasses,
    getClassPupilsForClassPupilsPage,
    getClassPupilsForRegisterTable
} from '../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../Button/CommonIconButton';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const getClassPupils = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            id
            fullname
        }
    }
`;

// A group across classes takes its licence from its pupils' registration classes, so only pupils
// who are in one can be added to it. isPupilsWithClasses filters them out in SQL, so there is
// nothing to filter here.
const getSchoolPupilsToAddInGroupAcrossClasses = gql`
    query getSchoolPupils($schoolId: String!, $pupilName: String, $isPupilsWithClasses: Boolean) {
        getSchoolPupils(schoolId: $schoolId, pupilName: $pupilName, isPupilsWithClasses: $isPupilsWithClasses) {
            id
            fullname
        }
    }
`;

interface Pupil {
    id: string;
}
interface ParentClass {
    id: string;
    name: string;
}

interface FindExistingClassPupilProps {
    open: boolean;
    setOpen: () => void;
    isGroupAcrossClasses: boolean;
    schoolId: string;
    class_name?: string;
    classId?: string | string[];
    classPupils?: Pupil[];
    parentClass?: ParentClass | null;
    getSchoolClassForRegister?: DocumentNode | TypedDocumentNode;
}

const FindExistingClassPupil = ({
    open = false,
    setOpen,
    class_name,
    classId,
    isGroupAcrossClasses,
    schoolId,
    classPupils,
    parentClass,
    getSchoolClassForRegister
}: FindExistingClassPupilProps) => {
    const [selectedPupils, setSelectedPupils] = useState([]);
    const [dropDownOpen, setDropDownOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [dropdownList, setDropdownList] = useState([]);

    const { callSnackbar } = useContext(ThemeContext);

    const [getClassPupilsQuery, { error: error, loading: loading, data }] = useLazyQuery(getClassPupils);
    const [getSchoolPupilsForGACQuery, { error: errorGAC, loading: loadingGAC, data: dataGAC }] = useLazyQuery(
        getSchoolPupilsToAddInGroupAcrossClasses
    );

    const [addPupilsInClassMutation, { loading: addPupilsInClassLoading }] = useMutation(addPupilsInClass, {
        refetchQueries: [
            { query: getClassPupilsForRegisterTable, variables: { id: classId } },
            { query: getActivityGridDataForGroupAcrossClasses, variables: { id: classId } },
            { query: getSchoolClassForRegister, variables: { id: classId } },
            { query: getClassPupilsForClassPupilsPage, variables: { id: classId } }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, errorGAC);
    }, [error, errorGAC]);

    useEffect(() => {
        if (!isGroupAcrossClasses) {
            getClassPupilsQuery({
                variables: {
                    classId: parentClass?.id
                }
            });
        }
    }, [parentClass?.id, isGroupAcrossClasses]);

    const debouncedFetch = debounce(() => {
        getSchoolPupilsForGACQuery({
            variables: {
                schoolId,
                pupilName: searchValue,
                isPupilsWithClasses: true
            }
        });
    }, 500);

    useEffect(() => {
        if (dropDownOpen && searchValue) {
            debouncedFetch();
        }
    }, [dropDownOpen, searchValue, schoolId]);

    const _onDeletePupil = (index) => {
        const newArr = [...selectedPupils];

        newArr.splice(index, 1);
        setSelectedPupils(newArr);
    };

    useEffect(() => {
        const pupilsData = data?.getClassPupils || dataGAC?.getSchoolPupils;

        if (pupilsData && classPupils) {
            const filterExistingPupilInClass = pupilsData.filter(
                (schoolPupil) => !classPupils.map((classPupil) => classPupil.id).includes(schoolPupil.id)
            );
            const filterSeletedPupilInClass = filterExistingPupilInClass.filter(
                (existingPupil) => !selectedPupils.map((selectedPupil) => selectedPupil.id).includes(existingPupil.id)
            );

            setDropdownList(filterSeletedPupilInClass);
        }
    }, [data?.getClassPupils, classPupils, selectedPupils, dataGAC?.getSchoolPupils]);

    const head = ['Pupil name', 'Action'];

    return (
        <DialogWrapper
            className="edit-class-detail-modal"
            heading={`Add pupils to ${class_name}`}
            open={open}
            setOpen={setOpen}
            contentWidth="865px"
            cancelBtn
            dialogFooter
            primaryBtnText="Add pupils"
            primaryBtnloading={addPupilsInClassLoading}
            primaryBtnDisabled={!selectedPupils.length || addPupilsInClassLoading}
            primaryBtnHandler={() => {
                addPupilsInClassMutation({ variables: { classId, pupilIds: selectedPupils.map((pupil) => `${pupil.id}`) } })
                    .then(() => {
                        setOpen();
                        callSnackbar('Added pupils successfully', 'success');
                    })
                    .catch((error) => callSnackbar(error, 'error'));
            }}>
            <Paragraph
                text={`Please select which pupils from ${isGroupAcrossClasses ? 'school' : parentClass?.name} should be added to this group.`}
                customClass="my6"
            />
            <Autocomplete
                className="my6"
                id="combo-box-demo"
                options={dropdownList}
                loading={loading || loadingGAC}
                loadingText={loading || loadingGAC}
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
                        label="Search for a pupil"
                        variant="outlined"
                        color="primary"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <React.Fragment>
                                    {loading || loadingGAC ? <CircularProgress color="inherit" size={20} /> : null}
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
                <CommonTable head={head} pagination={false} className="class_pupil_table" actions>
                    {selectedPupils.map((pupil, index) => (
                        <TableRow key={pupil?.id}>
                            <TableCell>
                                <Paragraph text={pupil?.fullname} />
                            </TableCell>

                            <TableCell align="center">
                                <CommonIconButton onClick={() => _onDeletePupil(index)} icon="close" toolTipTitle="Delete" />
                            </TableCell>
                        </TableRow>
                    ))}
                </CommonTable>
            </Paper>

            <br />
            <br />
            <br />
            <br />
        </DialogWrapper>
    );
};

export default FindExistingClassPupil;
