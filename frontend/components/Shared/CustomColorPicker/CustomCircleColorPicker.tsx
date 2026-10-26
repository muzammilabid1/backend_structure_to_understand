import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { TagsCategoryType } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import ColorCircle from '../ColorCircle';
import CommonPopOver from '../CommonPopOver';
import ShowTagByColor from './ShowTagByColor';

export const getRecentAddedColors = gql`
    query getRecentAddedColors($category: TagsCategoryType!, $schoolId: String) {
        getRecentAddedColors(category: $category, schoolId: $schoolId) {
            color
        }
    }
`;

interface CustomCircleColorPickerProps {
    category?: string;
    activeColor?: string;
    onChange: (color: string) => void;
    setOwnColor: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

const CustomCircleColorPicker = ({ activeColor = '', onChange, setOwnColor, category }: CustomCircleColorPickerProps) => {
    const { token, callSnackbar } = useContext(ThemeContext);
    let ListItemColor = ['#F28D00', '#9BC53D', '#39B0E2', '#887DFF', '#922C52', '#00303C', '#6F60AE', '#C66C00', '#7F972A'];

    const { error: getRecentAddedColorsError, data: getRecentAddedColorsData } = useQuery(getRecentAddedColors, {
        variables: { category: TagsCategoryType[category], schoolId: token?.schoolId }
    });

    ListItemColor = Array.from(
        new Set([...ListItemColor, ...(getRecentAddedColorsData?.getRecentAddedColors || []).map(({ color }) => color)])
    );

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, getRecentAddedColorsError);
    }, [getRecentAddedColorsError]);

    return (
        <Grid container gap={1} alignContent={'center'}>
            {ListItemColor?.map((color) => {
                const isActive = activeColor?.toLowerCase() === color?.toLowerCase();

                return (
                    <CommonPopOver
                        key={color}
                        element={<ColorCircle isActive={isActive} color={color} onChange={() => onChange(color)} />}
                        hover>
                        <ShowTagByColor category={category} color={color} />
                    </CommonPopOver>
                );
            })}
            <span className="material-icons cp" onClick={() => setOwnColor((pre) => !pre)}>
                palette
            </span>
        </Grid>
    );
};

export default CustomCircleColorPicker;
