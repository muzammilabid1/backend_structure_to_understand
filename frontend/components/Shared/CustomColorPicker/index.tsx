/* eslint-disable @typescript-eslint/no-explicit-any */
import { Grid } from '@mui/material';
import React, { useState } from 'react';
import { SketchPicker } from 'react-color';

import CommonCard from '../Cards/CommonCard';
import CommonTag from '../CommonTag';
import CustomCircleColorPicker from './CustomCircleColorPicker';

type CustomColorPickerProps = {
    preview?: boolean;
    previewText?: string;
    value?: string;
    category?: string;
    onChange?: any;
    name?: string;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
};

const CustomColorPicker = ({
    preview = false,
    previewText,
    value = '',
    category,
    onChange,
    name,
    xs = 12,
    sm = 12,
    md = 12,
    lg = 12
}: CustomColorPickerProps) => {
    const [ownColor, setOwnColor] = useState(false);

    value = value == null ? '' : value;

    return (
        <Grid item xs={xs} sm={sm} md={md} lg={lg} classes={{ root: 'root' }}>
            <CustomCircleColorPicker
                activeColor={value}
                onChange={(e) => onChange({ target: { name, value: e } })}
                setOwnColor={setOwnColor}
                category={category}
            />
            {ownColor && (
                <>
                    <br />
                    <SketchPicker
                        onChange={(e) => onChange({ target: { name, value: e.hex } })}
                        color={value}
                        className="custom_color_picker"
                    />
                </>
            )}
            <br />
            {preview && (
                <>
                    <CommonCard>
                        <Grid container justifyContent={'center'}>
                            <CommonTag name={previewText || 'Preview'} bgColor={value} />
                        </Grid>
                    </CommonCard>
                    <br />
                    This is what your tag would look like
                </>
            )}
        </Grid>
    );
};

export default CustomColorPicker;
