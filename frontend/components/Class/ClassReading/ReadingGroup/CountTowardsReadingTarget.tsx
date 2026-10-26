import { gql, useLazyQuery } from '@apollo/client';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Grid, Skeleton } from '@mui/material';
import { Box } from '@mui/system';
import { FormikHandlers } from 'formik';
import { useEffect, useMemo } from 'react';

import CommonCheckBox from '../../../Shared/CommonCheckBox';
import CommonPopOver from '../../../Shared/CommonPopOver';

const shouldCountTowardsWeeklyReadingTarget = gql`
    query shouldCountTowardsWeeklyReadingTarget($pupilIds: [String!]!, $readingDate: DateTime!) {
        shouldCountTowardsWeeklyReadingTarget(pupilIds: $pupilIds, readingDate: $readingDate)
    }
`;

interface CountTowardsReadingTargetProps {
    pupilIds: string[];
    bookReadAt: string;
    includeInReadingTarget: boolean;
    handleBlur: FormikHandlers['handleBlur'];
    handleUpdate: (value: boolean) => void;
    error: string;
    touched: boolean;
}

const CountTowardsReadingTarget: React.FC<CountTowardsReadingTargetProps> = ({
    pupilIds,
    bookReadAt,
    includeInReadingTarget,
    handleBlur,
    handleUpdate,
    error,
    touched
}: CountTowardsReadingTargetProps) => {
    const [fetchShouldCountTowardsWeeklyReadingTarget, { loading, data }] = useLazyQuery(shouldCountTowardsWeeklyReadingTarget);

    useEffect(() => {
        if (pupilIds?.length > 0 && bookReadAt) {
            fetchShouldCountTowardsWeeklyReadingTarget({
                variables: {
                    pupilIds,
                    readingDate: bookReadAt
                }
            });
        }
    }, [pupilIds, bookReadAt]);

    const ableToCheckIncludeInReadingTarget = useMemo(() => {
        if (pupilIds.length === 0 || !bookReadAt) return false;

        return data?.shouldCountTowardsWeeklyReadingTarget;
    }, [data, pupilIds, bookReadAt]);

    useEffect(() => {
        if (includeInReadingTarget && ableToCheckIncludeInReadingTarget === false) {
            handleUpdate(false);
        }
    }, [includeInReadingTarget, ableToCheckIncludeInReadingTarget]);

    if (loading) return <Skeleton height={42} />;

    return (
        <CommonCheckBox
            className="count-towards-reading-target-checkbox"
            name="includeInReadingTarget"
            checked={includeInReadingTarget}
            onBlur={handleBlur}
            onChange={(e) => {
                handleUpdate(e.target.checked);
            }}
            error={error}
            touched={touched}
            disabled={!ableToCheckIncludeInReadingTarget}>
            <Box>
                Count this towards weekly reading target
                {ableToCheckIncludeInReadingTarget === false ? (
                    <CommonPopOver
                        hover
                        element={
                            <Box>
                                <InfoOutlinedIcon />
                            </Box>
                        }>
                        <Grid maxWidth={300}>
                            {pupilIds?.length > 0
                                ? "The weekly reading log hasn't been started for some pupils yet, so this entry cannot count towards any targets."
                                : 'Select pupils to make this field active'}
                        </Grid>
                    </CommonPopOver>
                ) : null}
            </Box>
        </CommonCheckBox>
    );
};

export default CountTowardsReadingTarget;
