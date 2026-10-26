import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import Paragraph from '../../Shared/Typography/Paragraph';

// Queries
const getTopicsOfDomain = gql`
    query getTopicsOfDomain($domainId: String!) {
        getTopicsOfDomain(domainId: $domainId) {
            teacherTopicName
        }
    }
`;

const ShowTopicName = ({ domainId }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getTopicsOfDomainQuery, { loading, error, data, called }] = useLazyQuery(getTopicsOfDomain, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getTopicsOfDomainQuery({ variables: { domainId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>
                    {data?.getTopicsOfDomain?.map((pupil) => (
                        <Paragraph text={pupil?.teacherTopicName} />
                    ))}
                </>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

ShowTopicName.propTypes = {
    domainId: PropTypes.number.isRequired
};

export default ShowTopicName;
