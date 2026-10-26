import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { deleteNews } from '../../../graphQl/mutations';
import { getAllNews } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import RenderHtml from './../../Shared/CommonRenderHtml';
import AddNewsModal from './../../Shared/Modals/AddNews';
import Heading2 from './../../Shared/Typography/Heading2';

const NewsOverviewAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error: error, data: allNews } = useQuery(getAllNews);
    const [open, setOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState(null);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteNewsMutation, { loading: deleteNewsLoading }] = useMutation(deleteNews, {
        refetchQueries: [{ query: getAllNews }],
        awaitRefetchQueries: true
    });

    const _onEdit = (newsId) => {
        setUpdateValues(allNews?.allNews.find((news) => news.id === newsId));
        setOpen(true);
    };

    const _onDelete = (newsId) => {
        if (!deleteNewsLoading) {
            const id = allNews?.allNews.find((news) => news.id === newsId)?.id;

            if (id) {
                deleteNewsMutation({ variables: { id: id } })
                    .then(() => {
                        callSnackbar('News item removed', 'success');
                    })
                    .catch(({ ...err }) => callSnackbar(err, 'error'));
            }
        }
    };

    const addNewsListItem = [
        {
            text: 'Add a news',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => {
                setUpdateValues(null);
                setOpen(!open);
            }
        }
    ];

    const head = [
        {
            accessor: 'col1',
            Header: 'Title'
        },
        {
            accessor: 'col2',
            Header: 'Description'
        },
        {
            accessor: 'col3',
            Header: 'Created at',
            width: '400',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        },
        {
            accessor: 'col4',
            Header: ''
        }
    ];

    const row = (allNews?.allNews || []).map((news) => {
        return {
            id: news?.id,
            col1: news.title,
            col2: <RenderHtml text={news?.description} />,
            col3: news?.logCreatedAt,
            col4: (
                <>
                    <CommonIconButton onClick={() => _onEdit(news.id)} icon="create" />
                    <CommonIconButton onClick={() => _onDelete(news.id)} icon="delete" />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'news-page'}>
            <div className="header">
                <Heading2 text="News" />
                <CommonListWithIcon list={addNewsListItem} />
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            {open && <AddNewsModal open={open} setOpen={() => setOpen(false)} updateValues={updateValues} />}
        </div>
    );
};

export default NewsOverviewAdmin;
