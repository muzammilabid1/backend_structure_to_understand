import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { deleteFAQ } from '../../../graphQl/mutations';
import { allFAQs } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import RenderHtml from './../../Shared/CommonRenderHtml';
import AddFAQModal from './../../Shared/Modals/AddFAQ';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const FAQsOverviewAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error: error, data: allFaqs } = useQuery(allFAQs);
    const [open, setOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState(null);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteFAQMutation, { loading: deleteFAQLoading }] = useMutation(deleteFAQ, {
        refetchQueries: [{ query: allFAQs }],
        awaitRefetchQueries: true
    });

    const _onEdit = (faqId) => {
        setUpdateValues(allFaqs?.allFAQs.find((faq) => faq.id === faqId));
        setOpen(true);
    };

    const _onDelete = (faqId) => {
        if (!deleteFAQLoading) {
            const id = allFaqs?.allFAQs.find((faq) => faq.id === faqId)?.id;

            if (id) {
                deleteFAQMutation({ variables: { id: id } })
                    .then(() => {
                        callSnackbar('FAQ item removed', 'success');
                    })
                    .catch(({ ...err }) => callSnackbar(err, 'error'));
            }
        }
    };

    const addFAQListItem = [
        {
            text: 'Add a FAQ',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpen(!open)
        }
    ];

    const heading = ['Question', 'Answer', ''];

    const head = heading.map((head, index) => {
        return { accessor: `col${index + 1}`, Header: head };
    });

    const row = (allFaqs?.allFAQs || []).map((faq) => {
        return {
            id: faq?.id,
            col1: <Paragraph text={faq?.question} />,
            col2: <RenderHtml text={faq?.answer} />,
            col3: (
                <>
                    <CommonIconButton onClick={() => _onEdit(faq.id)} icon="create" />
                    <CommonIconButton onClick={() => _onDelete(faq.id)} icon="delete" />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'faqs-page'}>
            <div className="header">
                <Heading2 text="FAQ's" />
                <CommonListWithIcon list={addFAQListItem} />
            </div>
            <CommonDraggableTable rows={row} columns={head} />
            {open && <AddFAQModal open={open} setOpen={setOpen} updateValues={updateValues} setUpdateValues={setUpdateValues} />}
        </div>
    );
};

export default FAQsOverviewAdmin;
