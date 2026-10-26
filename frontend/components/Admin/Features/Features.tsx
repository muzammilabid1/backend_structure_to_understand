import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { FeatureStatus } from 'lwp-shared';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpFeatures } from '../../../types/entities/IStaticLwpFeatures';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import UpdateFeatureModal from '../../Shared/Modals/UpdateFeatureModal';
import ShowFeatureSchoolTags from '../../Shared/ShowFeatureSchoolTags';
import Paragraph from '../../Shared/Typography/Paragraph';

export const allFeatures = gql`
    query allFeatures {
        allFeatures {
            id
            name
            description
            status
            code
            includeSchoolsWithTags
            schoolTags {
                id
                name
                color
            }
        }
    }
`;

const Features = () => {
    const [editFeature, setEditFeature] = useState<{ open: boolean; feature: IStaticLwpFeatures }>({ open: false, feature: null });
    const { callSnackbar } = useContext(ThemeContext);
    const { data, loading, error } = useQuery(allFeatures);

    const features: IStaticLwpFeatures[] | null = useMemo(() => {
        return data?.allFeatures;
    }, [data?.allFeatures]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const heading = ['Feature name', 'Description', 'Release to', ''];

    const head = heading.map((head, index) => {
        const rowHead: { accessor: string; Header: string; width?: string } = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Description') {
            rowHead.width = '450';
        }

        return rowHead;
    });

    const getFeatureStatus = (status: string, featureId: string) => {
        if (status === FeatureStatus.LIMITED_RELEASE) {
            return (
                <Grid container>
                    <CommonPopOver element={<Paragraph text={'Limited release'} customClass="ul" />} hover>
                        <ShowFeatureSchoolTags featureId={featureId} />
                    </CommonPopOver>
                </Grid>
            );
        } else if (status === FeatureStatus.ALL_SCHOOLS) {
            return 'All schools';
        } else {
            return 'None';
        }
    };

    const row = (features || []).map((feature: IStaticLwpFeatures) => {
        return {
            id: feature?.id,
            col1: feature?.name,
            col2: feature?.description?.trim() || '-',
            col3: getFeatureStatus(feature?.status, feature?.id),
            col4: (
                <CommonIconButton
                    onClick={() => {
                        setEditFeature({
                            open: true,
                            feature
                        });
                    }}
                    dataTest={`${feature?.name?.toLowerCase()?.split(' ')?.join('-')}-edit-feature-button`}
                    icon="create"
                    toolTipTitle="Edit"
                />
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <Grid container display="flex" flexDirection="column" spacing={2}>
            <Grid item>
                <CommonDraggableTable rows={row} columns={head} />
            </Grid>
            {editFeature.open && <UpdateFeatureModal feature={editFeature.feature} setEditFeature={setEditFeature} />}
        </Grid>
    );
};

export default Features;
