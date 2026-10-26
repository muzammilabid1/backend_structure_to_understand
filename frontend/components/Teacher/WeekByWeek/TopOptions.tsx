import { Divider, Grid } from '@mui/material';
import React from 'react';

import { capitalizeFirstLetter } from '../../../shared/Services/handler';
import { ILwpSchoolClassDetails } from '../../../types/ILwpSchoolClass';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonButtonGroup from '../../Shared/CommonButtonGroup';

interface Options {
    subjects: string;
    pageView: string;
}

interface TopOptionsProps {
    options: Options;
    handleOptionsChange: (newOptions: Partial<Options>) => void;
    children: React.ReactNode;
    schoolClass: ILwpSchoolClassDetails;
}

const TopOptions = ({ options, handleOptionsChange, children, schoolClass }: TopOptionsProps) => {
    const groupBtn = [];

    if (schoolClass?.classTopicContext?.hasReadingTopic) {
        groupBtn.push('Reading');
    }

    if (schoolClass?.classTopicContext?.hasTopics) {
        groupBtn.push('Topics');
    }

    return (
        <div>
            <CommonCard
                csx={{
                    p: 2,
                    mb: 3
                }}
                className="week-by-week-top-options">
                <Grid container justifyContent={'space-between'} spacing={2}>
                    <Grid item lg={3} md={5} xs={12}>
                        <CommonButtonGroup
                            groupBtn={groupBtn}
                            select={capitalizeFirstLetter(options?.subjects)}
                            onClick={(value) => {
                                handleOptionsChange({ subjects: value.toUpperCase() });
                            }}
                        />
                    </Grid>

                    <Grid item lg={4} md={5} xs={12}>
                        <CommonButtonGroup
                            groupBtn={[
                                { key: 'EXPANDED', name: 'Expanded view' },
                                { key: 'COMPACT', name: 'Compact view' }
                            ]}
                            select={options?.pageView}
                            onClick={(value) => {
                                handleOptionsChange({ pageView: value.toUpperCase() });
                            }}
                        />
                    </Grid>
                </Grid>
                <Divider
                    sx={{
                        my: 3
                    }}
                />
                {children}
            </CommonCard>
        </div>
    );
};

export default TopOptions;
