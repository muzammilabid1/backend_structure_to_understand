/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { getTopicTagsForAdmin } from '../../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import CommonCircle from '../../../Shared/CommonCircle';
import CommonDraggableTable from '../../../Shared/CommonDraggableTable';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPopOver from '../../../Shared/CommonPopOver';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Paragraph from '../../../Shared/Typography/Paragraph';
import ShowTagTopics from './ShowTagTopics';

const deleteTopicTag = gql`
    mutation deleteTopicTag($id: String!) {
        deleteTopicTag(id: $id) {
            status
            msg
        }
    }
`;

interface TopicTagsProps {
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

const TopicsTags = ({ setActions, tagsOptions }: TopicTagsProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [openDeleteTag, setOpenDeleteTag] = useState(false);
    const [tagToBeDeletedId, setTagToBeDeletedId] = useState(null);

    const [getTagsQuery, { loading: getAllTagFormIsLoading, error, data: allTagFormData }] = useLazyQuery(getTopicTagsForAdmin, {
        fetchPolicy: 'network-only'
    });

    const useTagMutation = (mutationFn) => {
        return useMutation(mutationFn, {
            refetchQueries: [
                {
                    query: getTopicTagsForAdmin,
                    variables: {
                        filter: tagsOptions?.currentFilter
                    }
                }
            ],
            awaitRefetchQueries: true
        });
    };

    const [deleteTagMutation, { loading: deleteTagLoading }] = useTagMutation(deleteTopicTag);

    const _onEdit = (tagFormId) => {
        setActions({
            addATags: true,
            defaultValues: allTagFormData?.getTopicTagsForAdmin.find((tag) => tag.id === tagFormId)
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

    const heading = ['Name', 'Color', 'Applies to topics', ''];

    const head = heading.map((head, index) => {
        const rowHead: { accessor: string; Header: string; width?: string } = { accessor: `col${index + 1}`, Header: head };

        if (head === '' || head === 'date') {
            rowHead.width = '250';
        }

        return rowHead;
    });

    const Row = (allTagFormData?.getTopicTagsForAdmin || []).map((tag) => {
        return {
            id: tag?.id,
            col1: tag?.name,
            col2: <CommonCircle bg={tag.color} />,
            col3: (
                <Grid container>
                    <CommonPopOver element={<Paragraph text={`${tag.topicCount} topics`} customClass="ul" />} hover>
                        <ShowTagTopics tagId={tag.id} />
                    </CommonPopOver>
                </Grid>
            ),
            col4: (
                <>
                    <CommonIconButton onClick={() => _onEdit(tag?.id)} icon="create" toolTipTitle="Edit" />
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
            )}{' '}
        </div>
    );
};

export default TopicsTags;
