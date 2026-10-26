import React from 'react';

import RouteTabs from '../../Shared/RouteTabs';

/**
 * The two kinds of thing an admin builds on the Sequences area.
 *
 * Each tab is a link to its own route rather than local state, so a tab can be linked to, reloaded
 * and come back to from a create or edit screen. That is the same reason the class sequence filters
 * live in the URL.
 *
 * This gives the existing concept a label for the first time: the page was simply "Sequences" with
 * nothing to distinguish it from what a whole-school sequence is.
 */
export enum SequencesTab {
    ClassSequences = 0,
    WholeSchoolSequences = 1
}

const TABS = [
    { label: 'Class sequences', href: '/admin/sequences', dataTest: 'sequences-tab-class' },
    { label: 'Whole-school sequences', href: '/admin/sequences/whole-school', dataTest: 'sequences-tab-whole-school' }
];

const SequencesTabs = ({ active }: { active: SequencesTab }) => <RouteTabs tabs={TABS} active={active} ariaLabel="Sequence types" />;

export default SequencesTabs;
