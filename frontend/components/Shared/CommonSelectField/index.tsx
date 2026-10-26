/* eslint-disable @typescript-eslint/no-explicit-any */
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FormControl, FormHelperText, Grid, GridSize, InputLabel, ListSubheader, MenuItem, Select } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';

import CommonError from './../CommonError';
import CommonTooltipIcon from './../CommonTooltipIcon';

const useStyles = makeStyles({
    selectAdornment: {
        position: 'absolute',
        right: '30px',
        height: '-webkit-fill-available',
        cursor: 'pointer !important'
    },
    ChangeBackground: {
        backgroundColor: '#fff',
        padding: '0 4px'
    }
});

interface Option {
    key?: string | number;
    value?: string | number;
    disabled?: boolean;
    group?: string;
}

interface CommonSelectFieldProps {
    label?: string;
    value?: string | number;
    onBlur?: any;
    onChange?: any;
    error?: any;
    touched?: any;
    options?: Option[];
    helperText?: string;
    name?: string;
    shrink?: boolean;
    xs?: boolean | GridSize;
    sm?: boolean | GridSize;
    md?: boolean | GridSize;
    lg?: boolean | GridSize;
    displayEmpty?: boolean;
    disabled?: boolean;
    customClass?: string;
    style?: React.CSSProperties;
    infoText?: string;
    dataTest?: string;
}

const CommonSelectField = ({
    label,
    value = '',
    onBlur = () => {},
    onChange = () => {},
    error = '',
    touched = false,
    options = [],
    helperText,
    name,
    shrink,
    xs,
    sm,
    md,
    lg,
    displayEmpty,
    disabled = false,
    customClass,
    style,
    infoText,
    dataTest
}: CommonSelectFieldProps) => {
    const classes = useStyles();

    // Grouping options dynamically
    const groupedOptions = options.reduce((acc: { [key: string]: Option[] }, option) => {
        const group = option?.group || 'UN_GROUP';

        if (!acc[group]) {
            acc[group] = [];
        }

        acc[group].push(option);

        return acc;
    }, {});

    return (
        <Grid className={`common-select-field ${customClass}`} style={style} xs={xs} sm={sm} md={md} lg={lg} item>
            <FormControl
                variant="outlined"
                classes={{ root: 'root' }}
                disabled={disabled}
                className={`${disabled && 'disabled-field lwp-field-disabled'}`}>
                <InputLabel shrink={shrink} htmlFor="component-outlined" className={classes?.ChangeBackground}>
                    {label}
                </InputLabel>
                <Select
                    name={name}
                    labelId="demo-simple-select-outlined-label"
                    id="demo-simple-select-outlined"
                    value={value}
                    onChange={onChange}
                    label={label}
                    onBlur={onBlur}
                    displayEmpty={displayEmpty}
                    error={error && touched}
                    data-test={dataTest}
                    MenuProps={{
                        className: 'common-select-field-menu'
                    }}>
                    {Object.entries(groupedOptions).flatMap(([groupName, options]) => [
                        groupName !== 'UN_GROUP' && <ListSubheader className="select-field-group-header">{groupName}</ListSubheader>,
                        ...options.map((option) => (
                            <MenuItem key={option.key} disabled={option?.disabled} value={option.key}>
                                {option.value}
                            </MenuItem>
                        ))
                    ])}
                </Select>
                {infoText ? <CommonTooltipIcon text={infoText} img={<InfoOutlinedIcon className={classes.selectAdornment} />} /> : ''}
                <FormHelperText>{helperText}</FormHelperText>
                <CommonError error={error} touched={touched} />
            </FormControl>
        </Grid>
    );
};

export default CommonSelectField;
