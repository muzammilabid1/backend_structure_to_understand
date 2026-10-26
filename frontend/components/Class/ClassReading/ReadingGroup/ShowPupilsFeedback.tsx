import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../../../shared/Services/handler';
import Paragraph from '../../../Shared/Typography/Paragraph';

// Queries
const getFeedbackPupils = gql`
    query getFeedbackPupils($feedbackId: String!) {
        getFeedbackPupils(feedbackId: $feedbackId) {
            firstname
            lastname
            className
        }
    }
`;

interface ShowPupilsFeedbackProps {
    feedbackId: string;
}

const ShowPupilsFeedback = ({ feedbackId }: ShowPupilsFeedbackProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const forSchool = router?.asPath === '/log-reading';

    const [getPupilTopicProgressQuery, { loading, error, data, called }] = useLazyQuery(getFeedbackPupils, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error, callSnackbar]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getPupilTopicProgressQuery({ variables: { feedbackId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>
                    {data?.getFeedbackPupils?.map((pupil) => (
                        <div className="show_pupil_name">
                            <Paragraph text={`${pupil?.firstname} ${pupil?.lastname}`} />
                            {forSchool ? <Paragraph customClass="colorGray" text={pupil?.className} /> : ''}
                        </div>
                    ))}
                </>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowPupilsFeedback;
