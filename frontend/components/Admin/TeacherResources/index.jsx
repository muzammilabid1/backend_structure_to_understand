import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteResource } from '../../../graphQl/mutations';
import { getAllResources } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import RenderHtml from '../../Shared/CommonRenderHtml';
import AddResourceModal from '../../Shared/Modals/AddResource';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

const TeacherResources = () => {
    const [open, setOpen] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);
    const [updateValues, setUpdateValues] = useState(null);

    const { loading, error: error, data: resources } = useQuery(getAllResources);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteResourceMutation, { loading: deleteResourceIsLoading }] = useMutation(deleteResource, {
        refetchQueries: [{ query: getAllResources }],
        awaitRefetchQueries: true
    });

    const list = [
        {
            text: 'Add a resource',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => {
                setUpdateValues(null);
                setOpen(!open);
            }
        }
    ];

    const _onEdit = (resourceId) => {
        setUpdateValues(resources?.allResources.find((resource) => resource.id === resourceId));
        setOpen(true);
    };

    const _onDelete = (resourceId) => {
        if (!deleteResourceIsLoading) {
            const id = resources?.allResources.find((resource) => resource.id === resourceId)?.id;

            if (id) {
                deleteResourceMutation({ variables: { id: id } })
                    .then(() => {
                        callSnackbar('Resource removed', 'success');
                    })
                    .catch(({ ...err }) => callSnackbar(err, 'error'));
            }
        }
    };

    const heading = ['Resource', 'Title', 'Description', 'Leader only', 'Download/View', ''];

    const head = heading.map((head, index) => {
        return { accessor: `col${index + 1}`, Header: head };
    });

    const row = (resources?.allResources || []).map((resource) => {
        return {
            id: resource?.id,
            col1: (
                <Link passHref href={`${resource?.file}`}>
                    <a href={`${resource?.file}`} target="_blank" className="link">
                        {'Download resource'}
                    </a>
                </Link>
            ),
            col2: <Paragraph text={resource?.title} />,
            col3: <RenderHtml text={resource?.description} />,
            col4: <Paragraph text={resource.leaderOnly ? 'True' : 'False'} />,
            col5: <CommonIconButton disabled icon={resource?.download ? 'file_download' : 'visibility'} />,
            col6: (
                <>
                    <CommonIconButton onClick={() => _onEdit(resource?.id)} icon="create" />
                    <CommonIconButton onClick={() => _onDelete(resource?.id)} icon="delete" />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="static_site_for_admin_pages_container teacher_resources">
            <div className="header">
                <Heading2 text={'Teacher resources'} />
                <CommonListWithIcon list={list} />
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            {open && <AddResourceModal open={open} setOpen={setOpen} defaultValues={updateValues} />}
        </div>
    );
};

TeacherResources.propTypes = { setTitle: PropTypes.func };

export default TeacherResources;
