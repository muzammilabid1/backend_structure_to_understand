import { Grid } from '@mui/material';
import { SketchPicker } from 'react-color';

import { themColors } from '../../../../shared/Constant';
import ColorCircle from '../../../Shared/ColorCircle';
import CommonPopOver from '../../../Shared/CommonPopOver';

interface SelectColorProps {
    selectedColor: string;
    onChange: (color: string) => void;
    dataTest?: string;
}

const SelectColor = ({ selectedColor, onChange, dataTest }: SelectColorProps) => {
    const theme_color: string[] = [...themColors, '#000000', '#ffffff'];

    const colors: string[] = theme_color.includes(selectedColor) ? theme_color : [...theme_color, selectedColor];

    return (
        <div className="select-color">
            <Grid container gap={1} alignContent={'center'} alignItems="center">
                {colors.map((color: string) => (
                    <ColorCircle dataTest={dataTest} color={color} isActive={selectedColor === color} onChange={() => onChange(color)} />
                ))}
                <CommonPopOver icon="palette" closeOnClick={false} className="sss" childrenClass="select-color-popover">
                    <SketchPicker
                        onChange={(e: { hex: string }) => onChange(e.hex)}
                        color={selectedColor}
                        className="custom_color_picker"
                    />
                </CommonPopOver>
            </Grid>
        </div>
    );
};

export default SelectColor;
