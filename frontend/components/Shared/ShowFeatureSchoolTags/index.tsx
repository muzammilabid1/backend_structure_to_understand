import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Stack } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpSchoolTag } from '../../../types/entities/IStaticLwpSchoolTag';
import CommonTag from '../CommonTag';
import Paragraph from '../Typography/Paragraph';

export const getFeatureSchoolTags = gql`
    query getFeatureSchoolTags($featureId: String!) {
        getFeatureSchoolTags(featureId: $featureId) {
            id
            name
            color
        }
    }
`;

interface ShowFeatureSchoolTagsProps {
    featureId: string;
}

const ShowFeatureSchoolTags = ({ featureId }: ShowFeatureSchoolTagsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getFeatureSchoolTagsQuery, { loading, error, data, called }] = useLazyQuery(getFeatureSchoolTags, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getFeatureSchoolTagsQuery({ variables: { featureId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (loading || !called) return <CircularProgress />;

    return (
        <div>
            {data?.getFeatureSchoolTags?.length ? (
                <Stack direction="row" spacing={1}>
                    {data?.getFeatureSchoolTags?.map((schoolTag: IStaticLwpSchoolTag) => (
                        <CommonTag name={schoolTag?.name} bgColor={schoolTag?.color} />
                    ))}
                </Stack>
            ) : (
                <Paragraph text={'No school tags added yet'} />
            )}
        </div>
    );
};

export default ShowFeatureSchoolTags;
