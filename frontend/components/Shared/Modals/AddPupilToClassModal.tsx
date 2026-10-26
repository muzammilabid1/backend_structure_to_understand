import { gql, InternalRefetchQueriesInclude, useMutation, useQuery } from '@apollo/client';
import { Alert } from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';

import { changePupilClass } from '../../../graphQl/mutations';
import { getSchoolForDashboardWrapper } from '../../../graphQl/queries';
import { SchoolClassStatus } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../CommonLoading';
import CommonSelectField from '../CommonSelectField';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const getRegistrationClasses = gql`
    query getRegistrationClasses($schoolId: String!) {
        getRegistrationClasses(schoolId: $schoolId) {
            id
            name
            status
            yearGroup {
                year
            }
        }
    }
`;

interface AddPupilToClassModalProps {
    open: boolean;
    handleClose: () => void;
    schoolId: string;
    pupilId?: string;
    defaultClassId: string;
    refetchQueries?: InternalRefetchQueriesInclude;
    loading?: boolean;
    isRemovedDefaultClass?: boolean;
    onPupilClassChange?: (classId: string, selectedClassName: string) => void;
}

const AddPupilToClassModal = ({
    handleClose,
    schoolId,
    defaultClassId,
    pupilId,
    refetchQueries = [],
    loading,
    isRemovedDefaultClass,
    onPupilClassChange
}: AddPupilToClassModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    // if the change pupil class is called from the pupils tab, then the default class should be removed from the list
    const [classId, setClassId] = useState(!isRemovedDefaultClass ? defaultClassId : null);

    const {
        data,
        loading: registrationClassesLoading,
        error
    } = useQuery(getRegistrationClasses, {
        variables: {
            schoolId
        },
        skip: !schoolId
    });

    useEffect(() => {
        if (!isRemovedDefaultClass && data?.getRegistrationClasses) {
            setClassId(data?.getRegistrationClasses?.[0]?.id);
        }
    }, [data, isRemovedDefaultClass]);

    const [changePupilClassMutation, { loading: changePupilClassLoading, error: changePupilClassError }] = useMutation(changePupilClass, {
        refetchQueries: [
            ...Array.from(refetchQueries ?? []),
            {
                query: getSchoolForDashboardWrapper,
                variables: { id: schoolId }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, changePupilClassError);
    }, [changePupilClassError]);

    const { schoolClasses, selectedClass } = useMemo(() => {
        // Filter classes based on whether they should be removed
        const filteredClasses = (data?.getRegistrationClasses ?? []).filter((cls) =>
            isRemovedDefaultClass ? cls?.id != defaultClassId : true
        );

        // Find the selected class
        const selectedClass = filteredClasses.find((cls) => cls?.id === classId);

        // Map filtered classes to required format
        const schoolClasses = filteredClasses.map(({ name, id, yearGroup }) => ({
            value: name,
            key: id,
            group: yearGroup?.year
        }));

        return { schoolClasses, selectedClass };
    }, [data?.getRegistrationClasses, classId, defaultClassId]);

    const handleChangePupilClass = async () => {
        if (onPupilClassChange) {
            onPupilClassChange(classId, selectedClass?.name);

            return;
        }

        try {
            await changePupilClassMutation({
                variables: { newClassId: classId, pupilId: pupilId }
            });
            callSnackbar(`Pupil has been added to "${selectedClass?.name}" class`, 'success');
            handleClose();
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    return (
        <DialogWrapper
            open
            setOpen={handleClose}
            cancelBtn
            dialogFooter
            heading={defaultClassId ? 'Change class' : 'Add to Class'}
            primaryBtnHandler={handleChangePupilClass}
            primaryBtnDisabled={!classId}
            primaryBtnloading={changePupilClassLoading || loading}
            primaryBtnText={defaultClassId ? 'Change class' : 'Add to class'}
            contentWidth="450px"
            className="change-class-modal">
            {registrationClassesLoading ? (
                <CommonLoading />
            ) : (
                <div className="pt2">
                    <CommonSelectField
                        label={`Class name`}
                        options={schoolClasses}
                        value={classId}
                        dataTest="add-or-change-pupil-class-select"
                        onChange={(e) => setClassId(e.target.value)}
                    />
                    {classId && selectedClass && selectedClass?.status !== SchoolClassStatus.ACTIVE && (
                        <Alert severity="warning">
                            <Paragraph>
                                The selected class, <b>{selectedClass.name}</b>, is not currently active.
                            </Paragraph>
                        </Alert>
                    )}
                </div>
            )}
        </DialogWrapper>
    );
};

export default AddPupilToClassModal;
