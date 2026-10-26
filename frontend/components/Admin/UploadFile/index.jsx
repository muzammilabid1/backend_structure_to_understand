import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteAFile } from '../../../graphQl/mutations';
import { getAllFiles } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../../components/Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../../components/Shared/CommonDraggableTable';
import CommonListWithIcon from './../../../components/Shared/CommonListWithIcon';
import CommonLoading from './../../../components/Shared/CommonLoading';
import ConfirmationModal from './../../../components/Shared/Modals/ConfirmationModal';
import UploadFileModalForAdmin from './../../../components/Shared/Modals/UploadFileModalForAdmin';
import Heading2 from './../../../components/Shared/Typography/Heading2';

const UploadFilePageForAdmin = () => {
    const [open, setOpen] = useState(false);
    const [willDeleteItemId, setwillDeleteItemId] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);

    const { loading, error: getAllFilesError, data: allfiles } = useQuery(getAllFiles);

    useEffect(() => {
        getAllFilesError?.message && callSnackbar(getAllFilesError, 'error');
    }, [getAllFilesError]);

    const [deleteAFileMutation] = useMutation(deleteAFile, {
        refetchQueries: [{ query: getAllFiles }],
        awaitRefetchQueries: true
    });

    const list = [
        {
            text: 'Add a file',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => {
                setOpen(!open);
            }
        }
    ];

    const _onDelete = (fileId) => {
        const id = allfiles?.getAllFiles.find((file) => file.id === fileId)?.id;

        setwillDeleteItemId(+id);
        setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal);
    };

    const heading = ['File name', 'Download/View', ''];

    const head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'File name') {
            rowHead.width = '600';
        }

        return rowHead;
    });

    const row = (allfiles?.getAllFiles || []).map((file) => {
        return {
            id: file?.id,
            col1: (
                <Link passHref href={`${file?.filename}`}>
                    <Link href={`${file?.filename}`} target="_blank" className="link">
                        {`${file?.filename}`}
                    </Link>
                </Link>
            ),
            col2: <CommonIconButton disabled icon={file?.download ? 'file_download' : 'visibility'} />,
            col3: <CommonIconButton toolTipTitle="Delete" onClick={() => _onDelete(file.id)} icon="delete" />
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="static_site_for_admin_pages_container teacher_resources" data-test={'public-documents-page'}>
            <div className="header">
                <Heading2 text={'Files'} />
                <CommonListWithIcon list={list} />
            </div>
            <CommonDraggableTable rows={row} columns={head} />
            {open && <UploadFileModalForAdmin open={open} setOpen={setOpen} />}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    onConfirm={() => {
                        deleteAFileMutation({ variables: { id: willDeleteItemId } })
                            .then(() => {
                                callSnackbar('Form item removed', 'success');
                                setwillDeleteItemId(null);
                                setOpenDeleteItemConfirmationModal(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setwillDeleteItemId(null);
                                setOpenDeleteItemConfirmationModal(false);
                            });
                    }}
                />
            )}
        </div>
    );
};

UploadFilePageForAdmin.propTypes = { setTitle: PropTypes.func };

export default UploadFilePageForAdmin;
