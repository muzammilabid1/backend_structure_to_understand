/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Box,
    Checkbox,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    MenuItem,
    Select
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { orderBy } from 'lodash';
import React, { useState } from 'react';

import CommonError from '../../Shared/CommonError';
import InputField from '../../Shared/InputField/InputField';
import Paragraph from '../../Shared/Typography/Paragraph';

const useStyles = makeStyles(() => ({
    formControl: {
        width: '100%'
    },
    MultiSelect: {
        backgroundColor: 'transparent !important'
    },

    colorBlack: {
        color: '#00303C !important'
    },

    colorGray: {
        color: '#999591 !important'
    },

    bgWhite: {
        backgroundColor: '#ffff'
    },

    bold: {
        fontWeight: 'bold !important'
    }
}));

interface Group {
    id: string;
    name: string;
    yearGroup?: string;
}

interface Class {
    id: string;
    name: string;
    yearGroup?: string;
}

interface Option {
    id: string;
    pupilName: string;
    groups: Group[];
    classes: Class[];
    class?: Class;
}

interface MultiSelectProps {
    options: Option[];
    error?: any;
    touched?: any;
    name: string;
    onChange: (selected: string[]) => void;
    selected: string[];
    className?: string;
    forSchool?: boolean;
    disabled?: boolean;
    dataTest?: string;
}

const MultiSelect = ({ options, error, touched, name, onChange, selected, className, forSchool, disabled, dataTest }: MultiSelectProps) => {
    const classes = useStyles();
    const [searchText, setSearchText] = useState('');

    const containsText = (text, searchText) => text.toLowerCase().indexOf(searchText.toLowerCase()) > -1;

    const getUniqueGroups = () => {
        const seenIds = new Set();

        const unique_groups = options?.reduce((uniqueGroups, option) => {
            for (const grp of option.groups) {
                if (!seenIds.has(grp.id)) {
                    seenIds.add(grp.id);
                    uniqueGroups.push({ ...grp, classes: option?.classes });
                }
            }

            return uniqueGroups;
        }, []);

        return orderBy(unique_groups, ['yearGroup', 'name'], ['asc', 'asc']);
    };

    const getUniqueClasses = () => {
        const seenIds = new Set();

        const unique_classes = options?.reduce((uniqueClasses, option) => {
            for (const cls of option.classes) {
                if (!seenIds.has(cls.id)) {
                    seenIds.add(cls.id);
                    uniqueClasses.push(cls);
                }
            }

            return uniqueClasses;
        }, []);

        return orderBy(unique_classes, ['yearGroup', 'name'], ['asc', 'asc']);
    };

    const uniqueGroups = getUniqueGroups();
    const uniqueClasses = getUniqueClasses();

    const getPupilFromGroup = (id) => {
        return options?.filter((option) => option?.groups?.some((group) => group?.id === id));
    };

    const getPupilFromclass = (id) => {
        return options?.filter((option) => option?.classes?.some((cls) => cls?.id === id));
    };

    const isAllSelected = options?.length > 0 && selected?.length === options?.length;

    const handleChange = (event) => {
        const value = event.target.value;
        const getLastValue = value[value.length - 1];

        if (getLastValue?.id) {
            const findPupil = getLastValue?.isclass ? getPupilFromclass(getLastValue?.id) : getPupilFromGroup(getLastValue?.id);

            if (getLastValue?.isSeleted) {
                onChange(selected?.filter((x) => !findPupil?.find(({ id }) => id === x)));

                return;
            }

            value.pop();
            onChange(Array.from(new Set([...value, ...findPupil.map(({ id }) => id)])));

            return;
        }

        if (getLastValue === 'all') {
            onChange(selected.length === options.length ? [] : options?.map(({ id }) => id));

            return;
        }

        onChange(value);
    };

    const checkGroup = (group) => {
        return getPupilFromGroup(group?.id)?.every((item) => selected?.includes(item?.id));
    };

    const checkClass = (cls) => {
        return getPupilFromclass(cls?.id)?.every((item) => selected?.includes(item?.id));
    };

    const matchKeysAndReturnNames = (options, selectedIds) => {
        const idToNameMapping = {};

        for (const option of options) {
            idToNameMapping[option?.id] = option?.pupilName;
        }

        const selectedNames = selectedIds.map((id) => idToNameMapping[id]);

        return selectedNames;
    };

    const renderValue = (selected) => {
        if (isAllSelected) {
            return <Chip label={'All pupils'} />;
        }

        const selectedPupils = [];
        let nonSelectedPupils = [...selected];

        uniqueClasses?.map((item) => {
            if (checkClass(item)) {
                selectedPupils.push(item);
                const currentGroup = getPupilFromclass(item.id);

                nonSelectedPupils = nonSelectedPupils?.filter((id) => !currentGroup.find((x) => x.id === id));
            }
        });

        uniqueGroups?.map((item) => {
            if (checkGroup(item)) {
                selectedPupils.push(item);
                const currentGroup = getPupilFromGroup(item.id);

                nonSelectedPupils = nonSelectedPupils?.filter((id) => !currentGroup.find((x) => x.id === id));
            }
        });

        if (nonSelectedPupils.length > 0) {
            selected = matchKeysAndReturnNames(options, selected);
        } else {
            selected = selectedPupils?.map((item) => item.name);
        }

        return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                    <Chip id={value} label={value} />
                ))}
            </Box>
        );
    };

    return (
        <FormControl className={`${classes.formControl} ${className}`}>
            <Divider />
            <InputLabel id="mutiple-select-label" className={`${classes.colorBlack} ${classes.bgWhite}`}>
                Select pupils
            </InputLabel>

            <Select
                name={name}
                MenuProps={{ autoFocus: false }}
                className="custum_multiselect"
                labelId="mutiple-select-label"
                multiple
                value={selected}
                onClose={() => setSearchText('')}
                onChange={handleChange}
                renderValue={renderValue}
                disabled={disabled}
                data-test={dataTest}>
                <br />
                <ListSubheader>
                    <InputField
                        key="search"
                        type="text"
                        label="Type to search"
                        lg={12}
                        md={12}
                        sm={12}
                        xs={12}
                        autoFocus
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Escape') e.stopPropagation();
                        }}
                    />
                </ListSubheader>

                {!forSchool && (
                    <MenuItem value="all">
                        <ListItemIcon>
                            <Checkbox
                                classes={{
                                    root: classes.colorBlack
                                }}
                                indeterminate={isAllSelected}
                                checked={isAllSelected}
                            />
                        </ListItemIcon>
                        <ListItemText primary="Select all" classes={{ primary: classes.bold }} />
                    </MenuItem>
                )}

                {!forSchool ? <Divider /> : ''}

                {(forSchool ? uniqueClasses : [])
                    ?.filter((option) => containsText(option?.name, searchText))
                    ?.map((cls) => {
                        return (
                            <MenuItem key={cls?.id} value={{ ...cls, isSeleted: checkClass(cls), isclass: true }}>
                                <ListItemIcon>
                                    <Checkbox
                                        classes={{
                                            root: classes.colorBlack
                                        }}
                                        indeterminate={checkClass(cls)}
                                        checked={checkClass(cls)}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    data-test="multi-select-main-options"
                                    primary={cls?.name}
                                    classes={{ primary: classes.bold }}
                                />
                            </MenuItem>
                        );
                    })}

                {forSchool && uniqueClasses?.length ? <Divider /> : ''}

                {uniqueGroups
                    ?.filter((option) => containsText(option?.name, searchText))
                    ?.map((group) => {
                        const className = group?.classes?.[0]?.name;

                        return (
                            <MenuItem key={group?.id} value={{ ...group, isSeleted: checkGroup(group), isgroup: true }}>
                                <ListItemIcon>
                                    <Checkbox
                                        style={{ top: className ? -14 : 0 }}
                                        classes={{
                                            root: classes.colorBlack
                                        }}
                                        indeterminate={checkGroup(group)}
                                        checked={checkGroup(group)}
                                    />
                                </ListItemIcon>
                                <ListItemText>
                                    <Paragraph text={group?.name} customClass={classes.bold} />
                                    <Paragraph text={className} customClass={classes.colorGray} />
                                </ListItemText>
                            </MenuItem>
                        );
                    })}

                {uniqueGroups?.length ? <Divider /> : ''}

                {options
                    ?.filter((option) => containsText(option?.pupilName, searchText))
                    ?.map((option) => {
                        /**
                         * While updating feedback, if the logged-in user is a teacher (not a leader)
                         * and they are updating feedback for a pupil who is not in their class,
                         * the pupil's class name should be displayed. And their class name will not appeared in the above group list.
                         */

                        const className = option?.classes?.[0]?.name ?? option?.class?.name;

                        return (
                            <MenuItem
                                classes={{
                                    root: classes.MultiSelect
                                }}
                                key={option?.id}
                                value={option?.id}>
                                <ListItemIcon>
                                    <Checkbox
                                        style={{ top: className ? -14 : 0 }}
                                        classes={{
                                            root: classes.colorBlack
                                        }}
                                        checked={selected?.indexOf(option?.id) > -1}
                                    />
                                </ListItemIcon>
                                <ListItemText data-test="multi-select-options">
                                    <Paragraph text={option?.pupilName} />
                                    <Paragraph text={className} customClass={classes.colorGray} />
                                </ListItemText>
                            </MenuItem>
                        );
                    })}
            </Select>

            <CommonError error={error} touched={touched} />
        </FormControl>
    );
};

export default MultiSelect;
