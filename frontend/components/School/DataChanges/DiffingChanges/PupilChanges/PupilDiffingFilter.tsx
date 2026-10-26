import { useEffect, useMemo } from 'react';

import CommonCard from '../../../../Shared/Cards/CommonCard';
import CommonButtonGroup from '../../../../Shared/CommonButtonGroup';
import CommonSwitch from '../../../../Shared/CommonSwitch';
import { PupilDiffingFilterCategory } from '.';

interface PupilDiffingFilterProps {
    counts?: Record<PupilDiffingFilterCategory, number>;
    selected?: string;
    handleSelect?: (key: PupilDiffingFilterCategory) => void;
    includeRejectedChanges: boolean;
    handleIncludeRejectedChanges: (value: boolean) => void;
}

const PupilDiffingFilter = ({
    counts,
    selected,
    handleSelect,
    includeRejectedChanges,
    handleIncludeRejectedChanges
}: PupilDiffingFilterProps) => {
    const groupButtonWithCounts = useMemo(() => {
        const buttons = [
            {
                name: `All (${counts?.[PupilDiffingFilterCategory.ALL] ?? 0})`,
                key: PupilDiffingFilterCategory.ALL,
                dataTest: 'pupil-diffing-filter-all-btn',
                isVisible: true
            },
            {
                name: `UPN (${counts?.[PupilDiffingFilterCategory.UPN] ?? 0})`,
                key: PupilDiffingFilterCategory.UPN,
                dataTest: 'pupil-diffing-filter-upn-btn',
                isVisible: counts?.[PupilDiffingFilterCategory.UPN] > 0
            },
            {
                name: `First name (${counts?.[PupilDiffingFilterCategory.FIRST_NAME] ?? 0})`,
                key: PupilDiffingFilterCategory.FIRST_NAME,
                dataTest: 'pupil-diffing-filter-first-name-btn',
                isVisible: counts?.[PupilDiffingFilterCategory.FIRST_NAME] > 0
            },
            {
                name: `Last name (${counts?.[PupilDiffingFilterCategory.LAST_NAME] ?? 0})`,
                key: PupilDiffingFilterCategory.LAST_NAME,
                dataTest: 'pupil-diffing-filter-last-name-btn',
                isVisible: counts?.[PupilDiffingFilterCategory.LAST_NAME] > 0
            },
            {
                name: `Date of birth (${counts?.[PupilDiffingFilterCategory.DATE_OF_BIRTH] ?? 0})`,
                key: PupilDiffingFilterCategory.DATE_OF_BIRTH,
                dataTest: 'pupil-diffing-filter-date-of-birth-btn',
                isVisible: counts?.[PupilDiffingFilterCategory.DATE_OF_BIRTH] > 0
            },
            {
                name: `Class (${counts?.[PupilDiffingFilterCategory.REGISTRATION_CLASS] ?? 0})`,
                key: PupilDiffingFilterCategory.REGISTRATION_CLASS,
                dataTest: 'pupil-diffing-filter-class-btn',
                isVisible: counts?.[PupilDiffingFilterCategory.REGISTRATION_CLASS] > 0
            },
            {
                name: `Deleted (${counts?.[PupilDiffingFilterCategory.DELETED] ?? 0})`,
                key: PupilDiffingFilterCategory.DELETED,
                dataTest: 'pupil-diffing-filter-deleted-btn',
                isVisible: counts?.[PupilDiffingFilterCategory.DELETED] > 0
            }
        ];

        return buttons.filter(({ isVisible }) => isVisible);
    }, [counts]);

    useEffect(() => {
        if (!groupButtonWithCounts.find(({ key }) => key === selected) && handleSelect) {
            handleSelect(PupilDiffingFilterCategory.ALL);
        }
    }, [groupButtonWithCounts, selected]);

    return (
        <CommonCard className="pupil-diffing-filter">
            {groupButtonWithCounts.length > 2 && (
                <CommonButtonGroup
                    groupBtn={groupButtonWithCounts}
                    select={selected}
                    onClick={(key) => handleSelect(key as PupilDiffingFilterCategory)}
                />
            )}

            <CommonSwitch
                label={'Include previously rejected changes'}
                checked={includeRejectedChanges}
                onClick={handleIncludeRejectedChanges}
            />
        </CommonCard>
    );
};

export default PupilDiffingFilter;
