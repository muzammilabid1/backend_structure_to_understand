/* eslint-disable @typescript-eslint/no-explicit-any */
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { Avatar, Chip, Grid } from '@mui/material';
import React, { useState } from 'react';

import CommonPopOver from '../CommonPopOver';
import CommonTag from '../CommonTag';
import DynamicPieChart from '../DynamicPieChart';
import EditTags from './EditTags';

interface CommonAddPupilInTagProps {
    tags?: any;
    showtype?: 'EXPANDED' | 'COMPACT';
    pupilId: string;
    schoolId: string;
    query: any;
    variables: any;
}

export interface IDialogWrapperOptionPupilTag {
    isOpen: boolean;
    pupilIds: string[] | null;
    schoolId: string | null;
}

const CommonAddPupilInTag: React.FC<CommonAddPupilInTagProps> = ({
    tags = [],
    showtype = 'EXPANDED',
    pupilId,
    schoolId,
    query,
    variables
}) => {
    const initialValue: IDialogWrapperOptionPupilTag = {
        isOpen: false,
        pupilIds: [pupilId],
        schoolId
    };

    const [dialogWrapperOption, setDialogWrapperOption] = useState<IDialogWrapperOptionPupilTag>(initialValue);

    const pieData = tags.map((tag) => ({ color: tag.color, value: 1 }));

    const onEditTagHandler = () => {
        setDialogWrapperOption({ ...initialValue, isOpen: true });
    };

    const renderNoTags = () => {
        if (showtype === 'EXPANDED') {
            return (
                <Chip
                    onClick={onEditTagHandler}
                    data-test="add-pupil-tag-button"
                    label={
                        <AddIcon
                            sx={{
                                fontSize: '19px'
                            }}
                        />
                    }
                    sx={{
                        backgroundColor: '#D6D1CB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        '& .MuiChip-label': {
                            padding: '4px 8px'
                        }
                    }}
                />
            );
        } else {
            return (
                <Avatar sx={{ width: 25, height: 25, color: '#000', cursor: 'pointer' }} onClick={onEditTagHandler}>
                    <AddIcon sx={{ fontSize: '19px' }} />
                </Avatar>
            );
        }
    };

    const renderExpandedTags = () => (
        <Grid container gap="3px" alignItems={'center'}>
            {tags.map((tag) => (
                <CommonTag name={tag.name} bgColor={tag.color} dataTest="pupil-tag-name-chip" />
            ))}

            <Chip
                onClick={onEditTagHandler}
                data-test="edit-pupil-tag-button"
                label={
                    <EditIcon
                        sx={{
                            fontSize: '24px'
                        }}
                    />
                }
                sx={{
                    backgroundColor: '#D6D1CB',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    '& .MuiChip-label': {
                        padding: '4px'
                    }
                }}
            />
        </Grid>
    );

    const renderCompactTags = () => (
        <CommonPopOver
            element={
                <Grid onClick={onEditTagHandler} className="compact-tags">
                    <DynamicPieChart data={pieData} size={25} />
                </Grid>
            }
            hover>
            <Grid container gap="3px" maxWidth={300}>
                {tags.map((tag) => (
                    <CommonTag name={tag.name} bgColor={tag.color} />
                ))}
            </Grid>
        </CommonPopOver>
    );

    let content;

    if (tags.length === 0) {
        content = renderNoTags();
    } else if (showtype === 'EXPANDED') {
        content = renderExpandedTags();
    } else {
        content = renderCompactTags();
    }

    return (
        <>
            {content}
            {dialogWrapperOption?.isOpen ? (
                <EditTags
                    tags={tags}
                    options={dialogWrapperOption}
                    handleClose={() => setDialogWrapperOption(initialValue)}
                    query={query}
                    variables={variables}
                    onSuccess={() => setDialogWrapperOption(initialValue)}
                />
            ) : null}
        </>
    );
};

export default CommonAddPupilInTag;
