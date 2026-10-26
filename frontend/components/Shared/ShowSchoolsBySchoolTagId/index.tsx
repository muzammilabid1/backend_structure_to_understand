import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchool } from '../../../types/entities/ILwpSchool';
import Paragraph from '../Typography/Paragraph';

export const getSchoolsByTagId = gql`
    query getSchoolsByTagId($tagId: String!) {
        getSchoolsByTagId(tagId: $tagId) {
            id
            schoolName
        }
    }
`;

interface IShowSchoolsBySchoolTagIdProps {
    tagId: string;
}

const ShowSchoolsBySchoolTagId = ({ tagId }: IShowSchoolsBySchoolTagIdProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getTagSchoolsProgressQuery, { loading, error, data, called }] = useLazyQuery(getSchoolsByTagId, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getTagSchoolsProgressQuery({ variables: { tagId: tagId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (loading || !called) return <CircularProgress />;

    return (
        <div>
            {data?.getSchoolsByTagId?.length ? (
                data?.getSchoolsByTagId?.map((school: ILwpSchool) => <Paragraph text={school?.schoolName} key={school.id} />)
            ) : (
                <Paragraph text={'No schools added yet'} />
            )}
        </div>
    );
};

export default ShowSchoolsBySchoolTagId;
