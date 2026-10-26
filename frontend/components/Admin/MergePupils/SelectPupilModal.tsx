import { useQuery } from '@apollo/client';
import { Box, Grid } from '@mui/material';
import React, { useMemo, useState } from 'react';

import { getSchoolPupils } from '../../../graphQl/queries';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import DialogWrapper from '../../Shared/DialogWrapper';
import Paragraph from '../../Shared/Typography/Paragraph';
import type { PupilInfo } from './types';

type Props = {
    isOpen: boolean;
    toggleIsOpen: () => void;
    schoolId: string | null | undefined;
    pupilAId: string | null | undefined;
    onSelectPupilBId: (pupilId: string) => void;
};

export default function SelectPupilModal({ isOpen, toggleIsOpen, schoolId, pupilAId, onSelectPupilBId }: Props) {
    const isLoading = !schoolId || !pupilAId;

    const [pupilBId, setPupilBId] = useState<string | null>(null);

    const { loading: isLoadingSchoolPupils, data: allSchoolPupilsData } = useQuery<{
        getSchoolPupils: Array<PupilInfo>;
    }>(getSchoolPupils, {
        variables: { schoolId },
        skip: isLoading
    });

    const otherSchoolPupils = useMemo(
        () => (allSchoolPupilsData?.getSchoolPupils ?? []).filter(({ id }) => id !== pupilAId),
        [allSchoolPupilsData, pupilAId]
    );

    const pupilB = useMemo(() => otherSchoolPupils.find(({ id }) => id === pupilBId) ?? null, [otherSchoolPupils, pupilBId]);

    return (
        <DialogWrapper
            heading={'Select pupil for merge'}
            open={isOpen}
            setOpen={toggleIsOpen}
            primaryBtnText="Merge"
            primaryBtnHandler={() => {
                onSelectPupilBId(pupilBId);
                toggleIsOpen();
            }}
            primaryBtnDisabled={isLoading || !pupilBId}
            primaryBtnloading={isLoadingSchoolPupils}
            dialogFooter
            cancelBtn
            cancelBtnText="Cancel">
            <CommonMultiSelect
                multiple={false}
                options={otherSchoolPupils}
                value={pupilB}
                filterSelectedOptions={false}
                placeholder="Select a pupil"
                getOptionLabel={(option) => option?.fullname}
                renderOption={(props, option: PupilInfo) => {
                    return (
                        <Box component="li" {...props} key={option?.id}>
                            <Grid container gap={1} justifyContent="space-between">
                                <Grid item>
                                    <Paragraph text={option?.fullname} />
                                </Grid>
                                <Grid item>
                                    <Paragraph text={option?.schoolClassName} />
                                </Grid>
                            </Grid>
                        </Box>
                    );
                }}
                onChange={(value) => {
                    setPupilBId(value?.id ?? null);
                }}
            />
        </DialogWrapper>
    );
}
