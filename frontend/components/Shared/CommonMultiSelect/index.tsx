/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormControl, Grid } from '@mui/material';
import Autocomplete, { AutocompleteRenderOptionState } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import React from 'react';

import CommonError from './../CommonError';

interface OptionType {
    value?: string;
    key?: string;
    color?: string;
    id?: string;
    // Add any other relevant fields that your options might have
}

interface CommonMultiSelectProps {
    label?: string;
    name?: string;
    value?: any;
    options?: OptionType[];
    touched?: any;
    error?: any;
    onChange?: any;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    disabled?: boolean;
    renderTags?: (value: OptionType[], getTagProps: (arg0: { index: number }) => any) => React.ReactNode;
    renderOption?: (
        props: React.HTMLAttributes<HTMLLIElement>,
        option: OptionType,
        state: AutocompleteRenderOptionState
    ) => React.ReactNode;
    groupBy?: (option: OptionType) => string;
    loading?: boolean;
    renderGroup?: (params: object) => React.ReactNode;
    className?: string;
    customClassName?: string;
    placeholder?: string;
    dataTest?: string;
    multiple?: boolean;
    filterSelectedOptions?: boolean;
    [x: string]: any;
}

const CommonMultiSelect = ({
    label,
    name,
    value = [],
    options = [],
    touched,
    error,
    onChange,
    xs = 12,
    sm = 12,
    md = 12,
    lg = 12,
    disabled,
    renderTags = null,
    renderOption,
    groupBy,
    loading,
    renderGroup,
    className,
    customClassName,
    placeholder,
    dataTest,
    multiple = true,
    filterSelectedOptions = true,
    ...rest
}: CommonMultiSelectProps) => {
    return (
        <Grid className={customClassName} xs={xs} sm={sm} md={md} lg={lg} item>
            <FormControl variant="outlined" classes={{ root: 'root' }} className={`${disabled ? '' : 'input-field'} ${className}`}>
                <Autocomplete
                    multiple={multiple}
                    id="checkboxes-tags-demo"
                    value={value}
                    data-test={dataTest}
                    options={options}
                    groupBy={groupBy}
                    getOptionLabel={(option) => option?.value || ''}
                    renderOption={renderOption}
                    loading={loading}
                    filterSelectedOptions={filterSelectedOptions}
                    isOptionEqualToValue={(item: any, current: any) => {
                        return Object.prototype.hasOwnProperty.call(item, 'id') ? item?.id === current?.id : item?.key === current?.key;
                    }}
                    disabled={disabled}
                    onChange={(_, newValue) => {
                        onChange(newValue as OptionType[]);
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            name={name}
                            placeholder={placeholder}
                            variant="outlined"
                            label={label}
                            error={Boolean(touched && error)}
                        />
                    )}
                    renderTags={renderTags}
                    renderGroup={renderGroup}
                    {...rest}
                />

                <CommonError error={error} touched={touched} />
            </FormControl>
        </Grid>
    );
};

export default CommonMultiSelect;
