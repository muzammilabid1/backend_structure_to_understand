import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import Paragraph from '../../Shared/Typography/Paragraph';

// Queries
const getTopicForAdmin = gql`
    query getTopicForAdmin($id: String!) {
        getTopicForAdmin(id: $id) {
            schoolTags {
                id
                name
            }
        }
    }
`;

type ShowSchoolTagsProps = {
    tagId: number;
};

const ShowSchoolTags = ({ tagId }: ShowSchoolTagsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getTopicForAdminQuery, { loading, error, data, called }] = useLazyQuery(getTopicForAdmin, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getTopicForAdminQuery({ variables: { id: tagId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>{data?.getTopicForAdmin?.schoolTags?.map((tag) => <Paragraph text={tag?.name} />)}</>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowSchoolTags;
