import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { TagsCategoryType } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonTag from '../CommonTag';
import Paragraph from '../Typography/Paragraph';

// Queries
export const getTagsByColor = gql`
    query getTagsByColor($input: GetTagsByColorInput!) {
        getTagsByColor(input: $input) {
            id
            name
            color
        }
    }
`;

type ShowTagByColorProps = {
    category?: string;
    color?: string;
};

const ShowTagByColor = ({ category, color }: ShowTagByColorProps) => {
    const { token, callSnackbar } = useContext(ThemeContext);

    const [progressQuery, { loading, error, data, called }] = useLazyQuery(getTagsByColor, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            progressQuery({
                variables: {
                    input: {
                        schoolId: token?.schoolId,
                        category: TagsCategoryType[category],
                        color: color
                    }
                }
            });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                data?.getTagsByColor?.length > 0 ? (
                    <Grid
                        container
                        gap={1}
                        alignContent={'center'}
                        sx={{
                            maxWidth: 312
                        }}>
                        <Paragraph text={'This color has been used in the following tags:'} />
                        {data?.getTagsByColor?.map((item) => <CommonTag name={item?.name} bgColor={item?.color} />)}
                    </Grid>
                ) : (
                    `(none)`
                )
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowTagByColor;
