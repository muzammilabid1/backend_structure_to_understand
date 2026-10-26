import { gql, useQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { ISequenceCandidateTopicGroup, ISequenceTopic } from '../../../types/entities/IStaticLwpTopicSequence';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonError from '../../Shared/CommonError';
import InputField from '../../Shared/InputField/InputField';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';

/**
 * Already grouped by domain and restricted to published, visible topics for the
 * chosen subject and year group. Deliberately not allTopicDomainsWithTopics, which
 * is school-scoped and resolves topics across every year group.
 */
const getCandidateTopicsForSequence = gql`
    query getCandidateTopicsForSequence($subjectId: String!, $yearGroupId: String!, $search: String) {
        getCandidateTopicsForSequence(subjectId: $subjectId, yearGroupId: $yearGroupId, search: $search) {
            domainId
            domainTitle
            topics {
                id
                teacherTopicName
                logCreatedAt
            }
        }
    }
`;

interface SequenceTopicPickerProps {
    subjectId: string;
    yearGroupId: string;
    /** Topics already in the sequence. They are dropped from the list, since they cannot be added again. */
    selectedTopicIds: string[];
    onAdd: (topic: ISequenceTopic) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * How many topics to browse without searching. Some subjects have hundreds in
 * production, and listing them all buries the rest of the form.
 */
const BROWSE_LIMIT = 5;

/** A search still needs a ceiling, or a one-letter search lists everything again. */
const SEARCH_LIMIT = 25;

interface DisplayGroup {
    domainId: string;
    domainTitle: string;
    topics: ISequenceTopic[];
}

/**
 * Takes the most recently created topics across every domain, then regroups them
 * so the picker still browses by domain as the ticket asks. Sorting happens across
 * the whole set rather than within each group, or the cap would favour whichever
 * domain sorted first.
 */
const takeMostRecent = (groups: ISequenceCandidateTopicGroup[], excluded: Set<string>, limit: number) => {
    const flattened = groups.flatMap((group) => group.topics.filter((topic) => !excluded.has(topic.id)).map((topic) => ({ group, topic })));

    const mostRecent = [...flattened]
        .sort((a, b) => (b.topic.logCreatedAt || '').localeCompare(a.topic.logCreatedAt || ''))
        .slice(0, limit);

    const regrouped: DisplayGroup[] = [];

    // Rebuilt in the original domain order, so the list does not reshuffle as topics are added.
    groups.forEach((group) => {
        const topics = mostRecent.filter((entry) => entry.group.domainId === group.domainId).map((entry) => entry.topic);

        if (topics.length) regrouped.push({ domainId: group.domainId, domainTitle: group.domainTitle, topics });
    });

    return { groups: regrouped, shownCount: mostRecent.length, totalCount: flattened.length };
};

/**
 * Browses the topics that may go into a sequence, grouped by domain.
 *
 * Backed by getCandidateTopicsForSequence, which already restricts to published,
 * visible topics for the chosen subject and year group. So this component filters
 * nothing on relevance: it only caps how many it shows, and hides the ones already
 * added, so those slots go to topics the admin can actually pick.
 */
const SequenceTopicPicker = ({ subjectId, yearGroupId, selectedTopicIds, onAdd }: SequenceTopicPickerProps) => {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [search]);

    const { data, previousData, loading, error, refetch } = useQuery(getCandidateTopicsForSequence, {
        variables: { subjectId, yearGroupId, search: debouncedSearch || null },
        skip: !subjectId || !yearGroupId,
        fetchPolicy: 'cache-and-network',
        // So `loading` reliably flips on a refetch as well as on a variable change, since the
        // in-flight states below depend on it.
        notifyOnNetworkStatusChange: true
    });

    const isSearching = Boolean(debouncedSearch);

    /**
     * Apollo clears `data` whenever the variables change, so a search would otherwise blank the
     * list on every keystroke. Falling back to `previousData` keeps the current topics on screen
     * while the new ones load. It is safe to do so because the form remounts this component when
     * the subject or year group changes, so `previousData` can only ever be for the current scope.
     */
    const candidates: ISequenceCandidateTopicGroup[] =
        data?.getCandidateTopicsForSequence ?? previousData?.getCandidateTopicsForSequence ?? [];

    const { groups, shownCount, totalCount } = useMemo(
        () => takeMostRecent(candidates, new Set(selectedTopicIds), isSearching ? SEARCH_LIMIT : BROWSE_LIMIT),
        [candidates, selectedTopicIds, isSearching]
    );

    /** Nothing to show yet, so the wait needs to be stated plainly. */
    const isFirstLoad = loading && !candidates.length;
    /** Re-querying with topics already on screen, so they stay put and the refresh is shown quietly. */
    const isRefreshing = loading && candidates.length > 0;

    if (!subjectId || !yearGroupId) {
        return (
            <CommonCard>
                <Paragraph
                    dataTest="topic-picker-scope-prompt"
                    text="Choose a subject and a year group first. They set which topics this sequence can contain."
                />
            </CommonCard>
        );
    }

    const hiddenCount = totalCount - shownCount;

    return (
        <CommonCard>
            <div data-test="sequence-topic-picker">
                <Heading3 text="Add topics" />

                <Grid container>
                    <InputField
                        md={12}
                        lg={12}
                        name="topicSearch"
                        label="Search topics"
                        dataTest="topic-picker-search"
                        startIcon="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </Grid>

                {isFirstLoad ? (
                    // Deliberately not CommonLoading: that is a page-level loader, 50vh tall with an
                    // h1, and after ten seconds it offers to reload the page, which would throw away
                    // the sequence the admin is part-way through building. Same MUI spinner, so it
                    // still looks like the rest of the app.
                    <div className="sequence-topic-picker-loading" data-test="topic-picker-loading">
                        <CircularProgress data-test="topic-picker-loading-spinner" />
                        <Paragraph text="Loading topics for this subject and year group" />
                    </div>
                ) : error ? (
                    <div className="sequence-topic-picker-error" data-test="topic-picker-error">
                        <CommonError error="Those topics could not be loaded." touched />
                        <LWPButton
                            btnText="Try again"
                            dataTest="topic-picker-retry"
                            variant="text"
                            color="inherit"
                            size="small"
                            endIcon="refresh"
                            onClick={() => refetch()}
                        />
                    </div>
                ) : !groups.length ? (
                    <Paragraph
                        dataTest="topic-picker-empty-state"
                        text={
                            isSearching
                                ? 'No topics match that search for this subject and year group.'
                                : totalCount === 0 && selectedTopicIds.length
                                  ? 'Every available topic for this subject and year group is already in the sequence.'
                                  : 'There are no published topics for this subject and year group.'
                        }
                    />
                ) : (
                    <>
                        <Paragraph
                            customClass="sequence-topic-picker-hint"
                            dataTest="topic-picker-hint"
                            text={
                                isSearching
                                    ? hiddenCount > 0
                                        ? `Showing the first ${shownCount} of ${totalCount} matches. Narrow the search to see the rest.`
                                        : `${totalCount} ${totalCount === 1 ? 'match' : 'matches'}.`
                                    : hiddenCount > 0
                                      ? `Showing the ${shownCount} most recently added topics of ${totalCount}. Search to find any of the others.`
                                      : `Showing all ${totalCount} available ${totalCount === 1 ? 'topic' : 'topics'}.`
                            }
                        />

                        {isRefreshing ? (
                            <div className="sequence-topic-picker-refreshing" data-test="topic-picker-refreshing">
                                <CircularProgress size={18} data-test="topic-picker-refreshing-spinner" />
                                <Paragraph text="Loading topics" />
                            </div>
                        ) : null}

                        <div className="sequence-topic-picker-groups" aria-busy={isRefreshing} data-test="topic-picker-groups">
                            {groups.map((group) => (
                                <div key={group.domainId} data-test={`topic-picker-domain-${group.domainId}`}>
                                    <Heading3 text={group.domainTitle} />

                                    {group.topics.map((topic) => (
                                        <Grid
                                            container
                                            key={topic.id}
                                            alignItems="center"
                                            justifyContent="space-between"
                                            className="sequence-topic-picker-row"
                                            data-test={`topic-picker-topic-${topic.id}`}>
                                            <Grid item xs={8}>
                                                <Paragraph text={topic.teacherTopicName} isTruncate />
                                            </Grid>
                                            <Grid item>
                                                <LWPButton
                                                    btnText="Add"
                                                    dataTest={`topic-picker-add-${topic.id}`}
                                                    variant="text"
                                                    color="inherit"
                                                    size="small"
                                                    endIcon="add"
                                                    onClick={() => onAdd(topic)}
                                                />
                                            </Grid>
                                        </Grid>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </CommonCard>
    );
};

export default SequenceTopicPicker;
