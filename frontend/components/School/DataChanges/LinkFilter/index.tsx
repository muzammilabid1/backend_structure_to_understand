import { useMemo } from 'react';

import { LinkFilterCategory } from '../../../../types/IDataChange';
import CommonButtonGroup from '../../../Shared/CommonButtonGroup';

interface LinkFilterProps {
    counts: {
        [LinkFilterCategory.ALL]: number;
        [LinkFilterCategory.SUGGESTED_MATCHES]: number;
        [LinkFilterCategory.LOW_CONFIDENCE_MATCHES]: number;
        [LinkFilterCategory.UNMATCHED]: number;
    };
    selected: LinkFilterCategory;
    handleSelect?: (key: LinkFilterCategory) => void;
}

const LinkFilter = ({ counts, selected, handleSelect }: LinkFilterProps) => {
    const groupButtonWithCounts = useMemo(() => {
        const buttons = [
            {
                name: `All (${counts?.[LinkFilterCategory.ALL] ?? 0})`,
                key: LinkFilterCategory.ALL,
                isVisible: true
            },
            {
                name: `Suggested matches (${counts?.[LinkFilterCategory.SUGGESTED_MATCHES] ?? 0})`,
                key: LinkFilterCategory.SUGGESTED_MATCHES,
                isVisible: counts?.[LinkFilterCategory.SUGGESTED_MATCHES] > 0
            },
            {
                name: `Low confidence matches (${counts?.[LinkFilterCategory.LOW_CONFIDENCE_MATCHES] ?? 0})`,
                key: LinkFilterCategory.LOW_CONFIDENCE_MATCHES,
                isVisible: counts?.[LinkFilterCategory.LOW_CONFIDENCE_MATCHES] > 0
            },
            {
                name: `Unmatched (${counts?.[LinkFilterCategory.UNMATCHED] ?? 0})`,
                key: LinkFilterCategory.UNMATCHED,
                isVisible: counts?.[LinkFilterCategory.UNMATCHED] > 0
            }
        ];

        return buttons.filter(({ isVisible }) => isVisible);
    }, [counts]);

    if (groupButtonWithCounts.length < 3) return null;

    return <CommonButtonGroup groupBtn={groupButtonWithCounts} select={selected} onClick={handleSelect} />;
};

export default LinkFilter;
