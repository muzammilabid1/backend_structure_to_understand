import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Grid } from '@mui/material';
import { useRouter } from 'next/router';

import { capitalizeFirstLetter } from '../../../../../shared/Services/handler';
import { IStaticLwpSubject } from '../../../../../types/entities/IStaticLwpSubject';
import CommonButtonGroup from '../../../../Shared/CommonButtonGroup';
import Heading3 from '../../../../Shared/Typography/Heading3';

interface GraphHeaderProps {
    groupByButtons: Array<{
        name: string;
        graphLabel: string;
        dataTest: string;
    }>;
    selectedGroupBy: string;
    subjects: Array<IStaticLwpSubject>;
    selectedSubjectIds: Array<string>;
}

const GraphHeader = ({ groupByButtons, selectedGroupBy, subjects, selectedSubjectIds }: GraphHeaderProps) => {
    const router = useRouter();

    const handleSelectSubject = (subjectId: string, isSelected: boolean) => {
        const updatedSubjectIds = isSelected ? selectedSubjectIds.filter((id) => id !== subjectId) : [...selectedSubjectIds, subjectId];

        if (updatedSubjectIds?.length) {
            router.push({
                query: { ...router.query, subjectIds: updatedSubjectIds?.join(',') }
            });
        }
    };

    return (
        <Grid container className="graph-header" spacing={1} rowGap={1} justifyContent={'space-between'}>
            {subjects?.length ? (
                <Grid item>
                    <Heading3 text="Subjects" />
                    <Grid container display={'flex'} gap={1} flexWrap={'wrap'}>
                        {subjects?.map((subject) => {
                            const isSelected = selectedSubjectIds?.includes(subject?.id);

                            return (
                                <CommonButtonGroup
                                    groupBtn={[subject?.name]}
                                    select={isSelected ? subject?.name : null}
                                    onClick={() => handleSelectSubject(subject?.id, isSelected)}>
                                    <Grid display={'flex'} gap={1} alignItems="center">
                                        {isSelected ? (
                                            <CheckCircleRoundedIcon sx={{ color: '#FDC300' }} />
                                        ) : (
                                            <RadioButtonUncheckedIcon sx={{ color: '#D6D1CB' }} />
                                        )}
                                        {capitalizeFirstLetter(subject?.name)}
                                    </Grid>
                                </CommonButtonGroup>
                            );
                        })}
                    </Grid>
                </Grid>
            ) : null}

            <Grid item maxWidth={293}>
                <Heading3 text="Group by" />
                <CommonButtonGroup
                    groupBtn={groupByButtons}
                    select={selectedGroupBy}
                    onClick={(range) => {
                        router.push({ query: { ...router.query, range } });
                    }}
                    width={150}
                />
            </Grid>
        </Grid>
    );
};

export default GraphHeader;
