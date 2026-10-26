import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { ContentStatus, FeatureTooltipTargets } from 'lwp-shared';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { capitalizeFirstLetter, handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpFeatureTooltip } from '../../../types/entities/IStaticLwpFeatureTooltip';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import AddAndUpdateFeatureTooltip from '../../Shared/Modals/AddAndUpdateFeatureTooltip';

export const allFeatureTooltips = gql`
    query allFeatureTooltips {
        allFeatureTooltips {
            id
            name
            targetId
            order
            userTypes
            message
            status
            imageUrl
        }
    }
`;

const FeatureTooltips = () => {
    const [openTooltip, setOpenTooltip] = useState<{ open: boolean; tooltip: IStaticLwpFeatureTooltip }>({ open: false, tooltip: null });

    const { callSnackbar } = useContext(ThemeContext);
    const { data, loading, error } = useQuery(allFeatureTooltips);

    const features: IStaticLwpFeatureTooltip[] | null = useMemo(() => {
        return data?.allFeatureTooltips;
    }, [data?.allFeatureTooltips]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const heading = ['Name', 'Target ID', 'Status', 'Order', 'User Types', ''];

    const head = heading.map((head, index) => {
        const rowHead: { accessor: string; Header: string; width?: string } = { accessor: `col${index + 1}`, Header: head };

        if (head === '') {
            rowHead.width = '250';
        }

        if (head === 'Target ID') {
            rowHead.width = '350';
        }

        return rowHead;
    });

    const row = (Object.values(FeatureTooltipTargets) || []).map((targetTooltip: FeatureTooltipTargets) => {
        const tooltip = features?.find((tooltip) => tooltip?.targetId === targetTooltip);

        return {
            id: tooltip?.id,
            col1: tooltip?.name ?? '-',
            col2: tooltip?.targetId ?? targetTooltip,
            col3: tooltip?.status ? capitalizeFirstLetter(tooltip?.status) : capitalizeFirstLetter(ContentStatus.DRAFT),
            col4: tooltip?.order ?? '-',
            col5: tooltip?.id ? tooltip?.userTypes?.map((type) => capitalizeFirstLetter(type)).join(', ') : '-',
            col6: (
                <CommonIconButton
                    onClick={() => {
                        setOpenTooltip({
                            open: true,
                            tooltip: tooltip?.id
                                ? tooltip
                                : {
                                      targetId: targetTooltip,
                                      name: '',
                                      message: '',
                                      order: 0,
                                      status: ContentStatus.DRAFT,
                                      userTypes: [],
                                      id: null
                                  }
                        });
                    }}
                    dataTest={tooltip?.id ? `update-${targetTooltip}-button` : `add-${targetTooltip}-button`}
                    icon={tooltip?.id ? 'create' : 'add'}
                    toolTipTitle={tooltip?.id ? 'Edit' : 'Add'}
                />
            ),
            rowClassName: !tooltip?.id ? 'row-grey' : ''
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <Grid container display="flex" flexDirection="column" spacing={2} className="feature-tooltips-container">
            <Grid item className="feature-tooltips-table">
                <CommonDraggableTable rows={row} columns={head} />
            </Grid>
            {openTooltip.open && <AddAndUpdateFeatureTooltip tooltip={openTooltip.tooltip} setOpenTooltip={setOpenTooltip} />}
        </Grid>
    );
};

export default FeatureTooltips;
