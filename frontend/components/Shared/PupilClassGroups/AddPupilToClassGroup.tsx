import { gql, useMutation, useQuery } from '@apollo/client';
import { useContext, useEffect, useMemo, useState } from 'react';

import { changePupilClass } from '../../../graphQl/mutations';
import { getPupilForClassGroups } from '../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../CommonLoading';
import CommonSelectField from '../CommonSelectField';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const getClassGroupsForAddingPupil = gql`
    query getClassGroupsForAddingPupil($schoolId: String!, $classId: String!) {
        getClassGroupsForAddingPupil(schoolId: $schoolId, classId: $classId) {
            id
            name
        }
    }
`;

interface AddPupilToClassGroupProps {
    handleClose: () => void;
    classId: string;
    pupilId: string;
    schoolId: string;
    loading?: boolean;
    onPupilAddToGroup?: (groupId: string, selectedClassGroupName: string) => void;
}

const AddPupilToClassGroup = ({ handleClose, classId, pupilId, schoolId, loading, onPupilAddToGroup }: AddPupilToClassGroupProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [groupId, setGroupId] = useState('');

    const {
        data,
        loading: classGroupsLoading,
        error
    } = useQuery(getClassGroupsForAddingPupil, {
        variables: {
            classId,
            schoolId
        },
        skip: !classId || !schoolId
    });

    useEffect(() => {
        if (data?.getClassGroupsForAddingPupil) {
            setGroupId(data.getClassGroupsForAddingPupil?.[0]?.id);
        }
    }, [data]);

    const [addPupilToClassGroupMutation, { loading: addPupilToClassGroupLoading, error: addPupilToClassGroupError }] = useMutation(
        changePupilClass,
        {
            refetchQueries: [{ query: getPupilForClassGroups, variables: { id: pupilId } }],
            awaitRefetchQueries: true
        }
    );

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, addPupilToClassGroupError);
    }, [addPupilToClassGroupError]);

    const { classGroups, selectedClassGroupName } = useMemo(() => {
        const classGroups = (data?.getClassGroupsForAddingPupil ?? []).map((cls: { name: string; id: string }) => ({
            value: cls.name,
            key: cls.id
        }));

        const selectedClassGroup = classGroups.find((cls) => cls.key === groupId);

        return { classGroups, selectedClassGroupName: selectedClassGroup?.value };
    }, [data?.getClassGroupsForAddingPupil, groupId]);

    const handleAddPupilToClassGroup = async () => {
        try {
            if (onPupilAddToGroup) {
                onPupilAddToGroup(groupId, selectedClassGroupName);

                return;
            }

            await addPupilToClassGroupMutation({
                variables: { newClassId: groupId, pupilId: pupilId }
            });
            callSnackbar(`Pupil has been added to ${selectedClassGroupName} group`, 'success');
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
            heading={'Add to group'}
            primaryBtnHandler={handleAddPupilToClassGroup}
            primaryBtnDisabled={!groupId}
            primaryBtnText="Add to group"
            primaryBtnloading={addPupilToClassGroupLoading || loading}
            contentWidth="450px">
            {classGroupsLoading ? (
                <CommonLoading />
            ) : classGroups?.length > 0 ? (
                <div className="pt2 pb5">
                    <CommonSelectField
                        label={`Group name`}
                        dataTest="add-pupil-to-group-select"
                        options={classGroups}
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                    />
                </div>
            ) : (
                <Paragraph text="No class groups available." />
            )}
        </DialogWrapper>
    );
};

export default AddPupilToClassGroup;
