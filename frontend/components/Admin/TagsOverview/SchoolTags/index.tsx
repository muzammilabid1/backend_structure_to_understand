/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getSchoolTagsForAdmin } from '../../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import CommonCircle from '../../../Shared/CommonCircle';
import CommonDraggableTable from '../../../Shared/CommonDraggableTable';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPopOver from '../../../Shared/CommonPopOver';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import ShowSchoolsBySchoolTagId from '../../../Shared/ShowSchoolsBySchoolTagId';
import Paragraph from '../../../Shared/Typography/Paragraph';

const deleteSchoolTag = gql`
    mutation deleteSchoolTag($id: String!) {
        deleteSchoolTag(id: $id) {
            status
            msg
        }
    }
`;

interface SchoolTagsProps {
    setActions: any;
    tagsOptions: TagsOptions;
}

interface TagsOptions {
    defaultValues: any;
    addATags: boolean;
    openFilter: boolean;
    currentFilter: string | undefined;
    tabs: 'Topics' | 'Activities' | 'Schools';
}

const SchoolTags = ({ setActions, tagsOptions }: SchoolTagsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const searchParams = useSearchParams();

    const deleteItems = searchParams.get('filter') == 'DELETED_ITEMS';

    const [openDeleteTag, setOpenDeleteTag] = useState(false);
    const [tagToBeDeletedId, setTagToBeDeletedId] = useState(null);

    const [getTagsQuery, { loading: getAllTagFormIsLoading, error, data: allTagFormData }] = useLazyQuery(getSchoolTagsForAdmin, {
        fetchPolicy: 'network-only'
    });

    const useTagMutation = (mutationFn, options) => {
        return useMutation(mutationFn, {
            refetchQueries: [
                {
                    query: getSchoolTagsForAdmin,
                    variables: {
                        filter: options?.currentFilter
                    }
                }
            ],
            awaitRefetchQueries: true
        });
    };

    const [deleteTagMutation, { loading: deleteTagLoading }] = useTagMutation(deleteSchoolTag, tagsOptions);

    const _onEdit = (tagFormId) => {
        setActions({
            addATags: true,
            defaultValues: allTagFormData?.getSchoolTagsForAdmin.find((tag) => tag.id === tagFormId)
        });
    };

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        getTagsQuery({
            variables: {
                filter: tagsOptions?.currentFilter
            }
        });
    }, []);

    const _onClick = (id) => {
        setOpenDeleteTag(true);
        setTagToBeDeletedId(id);
    };

    if (getAllTagFormIsLoading) return <CommonLoading />;

    const heading = ['Name', 'Color', 'Applies to Schools', ''];

    let head = heading.map((head, index) => {
        const rowHead: { accessor: string; Header: string; width?: string } = { accessor: `col${index + 1}`, Header: head };

        if (head === '' || head === 'date') {
            rowHead.width = '250';
        }

        return rowHead;
    });

    if (deleteItems) {
        head = head.filter((rowHead) => rowHead.accessor !== 'col3');
    }

    const Row = (allTagFormData?.getSchoolTagsForAdmin || []).map((tag) => {
        return {
            id: tag?.id,
            col1: tag?.name,
            col2: <CommonCircle bg={tag.color} />,
            col3: (
                <Grid container>
                    <CommonPopOver element={<Paragraph text={`${tag.schoolCounts} schools`} customClass="ul" />} hover>
                        {tag?.schoolCounts > 0 ? <ShowSchoolsBySchoolTagId tagId={tag?.id} /> : null}
                    </CommonPopOver>
                </Grid>
            ),
            col4: (
                <>
                    <CommonIconButton
                        onClick={() => _onEdit(tag?.id)}
                        icon="create"
                        toolTipTitle="Edit"
                        dataTest="school-tag-edit-button"
                    />
                    <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(tag?.id)} icon={'delete'} />
                </>
            )
        };
    });

    return (
        <div className="schools_overview">
            <CommonDraggableTable rows={Row} columns={head} />

            {openDeleteTag && (
                <ConfirmationModal
                    open={openDeleteTag}
                    onCancel={() => setOpenDeleteTag(!openDeleteTag)}
                    loading={deleteTagLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteTagMutation({
                            variables: {
                                id: tagToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteTag(!openDeleteTag);
                                setTagToBeDeletedId(null);
                                callSnackbar('Tag deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteTag(!openDeleteTag);
                                setTagToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the tag." />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default SchoolTags;
