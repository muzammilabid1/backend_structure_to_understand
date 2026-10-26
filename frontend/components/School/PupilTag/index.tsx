import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid, TableCell, TableRow } from '@mui/material';
import { useParams } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { countWithPlural, handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchoolPupilTag } from '../../../types/entities/ILwpSchoolPupilTag';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCircle from '../../Shared/CommonCircle';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonPrioritySnackbar from '../../Shared/CommonPrioritySnackBar';
import CommonStatus from '../../Shared/CommonStatus';
import CommonTable from '../../Shared/CommonTable';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import ShowPupilsByPupilTagId from '../../Shared/ShowPupilsByPupilTagId';
import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';
import AddPupilTag from './AddPupilTag';

export const getAllSchoolPupilTags = gql`
    query getAllSchoolPupilTags($schoolId: String!) {
        getAllSchoolPupilTags(schoolId: $schoolId) {
            id
            name
            color
            pupilCounts
        }
    }
`;

const removeSchoolPupilTag = gql`
    mutation removeSchoolPupilTag($id: String!) {
        removeSchoolPupilTag(id: $id) {
            status
        }
    }
`;

export interface IDialogWrapperOption {
    isOpen: boolean;
    isDelete: boolean;
    tag?: ILwpSchoolPupilTag;
}
const initialValue: IDialogWrapperOption = {
    isOpen: false,
    isDelete: false,
    tag: null
};

const PupilTag = () => {
    const queryParams = useParams();
    const { setClaims } = useDelegatedClaims();
    const { callSnackbar } = useContext(ThemeContext);
    const [dialogWrapperOption, setDialogWrapperOption] = useState<IDialogWrapperOption>(initialValue);

    const schoolId = queryParams?.school_id;

    const { data, loading, error } = useQuery(getAllSchoolPupilTags, { variables: { schoolId } });

    const [removeSchoolPupilTagMutation, { loading: removeSchoolPupilTagLoading }] = useMutation(removeSchoolPupilTag, {
        refetchQueries: [
            {
                query: getAllSchoolPupilTags,
                variables: { schoolId }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        setClaims({ schoolId: schoolId as string });
    }, [schoolId]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const head = ['Name', 'Color', 'Applies to', ''];

    const listActions = (tag) => [
        {
            text: 'Edit',
            icon: 'edit',
            dataTest: 'edit-pupil-tag-button-option',
            onClick: () => {
                setDialogWrapperOption({
                    ...initialValue,
                    isOpen: true,
                    tag
                });
            }
        },
        {
            text: 'Delete',
            icon: 'delete',
            dataTest: 'delete-pupil-tag-button-option',
            onClick: () => {
                setDialogWrapperOption({
                    ...initialValue,
                    isDelete: true,
                    tag
                });
            }
        }
    ];

    const pupilTags = data?.getAllSchoolPupilTags ?? [];

    return (
        <div className="school-pupil-tag">
            <Grid container justifyContent="space-between" mb={3}>
                <Grid item>
                    <Heading1 text="Pupil tags" customClass="pupil-tag-heading" />
                </Grid>
                <Grid item>
                    <LWPButton
                        btnText="Add a new tag"
                        onClick={() =>
                            setDialogWrapperOption({
                                ...initialValue,
                                isOpen: true
                            })
                        }
                        color="inherit"
                        variant="text"
                        endIcon={'add'}
                        customClass="add-tag-button"
                    />
                </Grid>
                <Grid item xs={12}>
                    <CommonPrioritySnackbar
                        conditions={{
                            pupilTagPage: [{ key: 'pupil_tag', value: true, isShow: false }]
                        }}
                        page={'pupilTagPage'}
                    />
                </Grid>
            </Grid>

            {loading ? (
                <CommonLoading />
            ) : pupilTags?.length > 0 ? (
                <CommonTable head={head}>
                    {pupilTags.map((tag) => (
                        <TableRow key={tag.id}>
                            <TableCell>
                                <Paragraph dataTest="pupil-tag-name-cell" text={tag?.name} />
                            </TableCell>
                            <TableCell>
                                <CommonCircle bg={tag.color} />
                            </TableCell>
                            <TableCell>
                                <Grid container>
                                    <CommonPopOver
                                        hover
                                        element={<Paragraph text={countWithPlural('pupil', tag.pupilCounts)} customClass="ul" />}>
                                        {tag?.pupilCounts > 0 ? <ShowPupilsByPupilTagId id={tag?.id} /> : null}
                                    </CommonPopOver>
                                </Grid>
                            </TableCell>
                            <TableCell>
                                <Grid container justifyContent={'flex-end'}>
                                    <CommonPopOver bold icon="more_horiz">
                                        <CommonListWithIcon list={listActions(tag)} />
                                    </CommonPopOver>
                                </Grid>
                            </TableCell>
                        </TableRow>
                    ))}
                </CommonTable>
            ) : (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading={'No tags found'}
                    className="mt20"
                />
            )}

            {dialogWrapperOption?.isOpen ? (
                <AddPupilTag dialogWrapperOption={dialogWrapperOption} handleClose={() => setDialogWrapperOption(initialValue)} />
            ) : null}
            <ConfirmationModal
                open={dialogWrapperOption?.isDelete}
                onCancel={() => setDialogWrapperOption(initialValue)}
                loading={removeSchoolPupilTagLoading}
                onConfirm={() => {
                    removeSchoolPupilTagMutation({ variables: { id: dialogWrapperOption?.tag?.id } })
                        .then(() => {
                            callSnackbar('Removed', 'success');
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                        })
                        .finally(() => {
                            setDialogWrapperOption(initialValue);
                        });
                }}
                heading="Are you sure want to delete this tag?"
                btnText="Confirm">
                This will be removed from all the pupils who have this tag.
            </ConfirmationModal>
        </div>
    );
};

export default PupilTag;
