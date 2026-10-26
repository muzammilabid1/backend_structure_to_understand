import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import Paragraph from '../../../Shared/Typography/Paragraph';

// Queries
export const getTagTopics = gql`
    query getTagTopics($id: String!) {
        getTagTopics(id: $id) {
            id
            teacherTopicName
        }
    }
`;

type ShowTagTopicsProps = {
    tagId: number;
};

const ShowTagTopics = ({ tagId }: ShowTagTopicsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getTagTopicsProgressQuery, { loading, error, data, called }] = useLazyQuery(getTagTopics, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getTagTopicsProgressQuery({ variables: { id: tagId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>{data?.getTagTopics?.map((topic) => <Paragraph text={topic?.teacherTopicName} />)}</>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowTagTopics;
