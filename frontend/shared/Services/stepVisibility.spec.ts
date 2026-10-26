import { describe, expect, it } from 'vitest';

import { filterStepsForViewer, isSetByTeacherStepReady, isStepHiddenForSchoolTags } from './stepVisibility';

const hideForTags = (...ids: string[]) => ({ visibilityRules: { hideForSchoolTagIds: ids } });

describe('isStepHiddenForSchoolTags', () => {
    it('shows a step that carries no visibility rules at all', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', stepType: 'VIDEO' }, ['7'])).toBe(false);
    });

    it('shows a step whose rules are present but empty', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags() }, ['7'])).toBe(false);
    });

    it('shows a step when visibilityRules is explicitly null', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', visibilityRules: null }, ['7'])).toBe(false);
    });

    it('shows a step when the school carries no tags', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7') }, [])).toBe(false);
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7') }, null)).toBe(false);
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7') }, undefined)).toBe(false);
    });

    it('shows a step when none of the school tags match', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7', '8') }, ['9', '10'])).toBe(false);
    });

    it('hides a step when the school carries the tag', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7') }, ['7'])).toBe(true);
    });

    it('hides a step when the school matches any one of several listed tags', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7', '8', '9') }, ['3', '9'])).toBe(true);
    });

    it('matches ids regardless of whether they arrive as strings or numbers', () => {
        // Tag ids are bigints in the database. A silent string/number mismatch here would
        // make the whole rule look like it simply is not working.
        expect(isStepHiddenForSchoolTags({ id: '1', visibilityRules: { hideForSchoolTagIds: [7 as unknown as string] } }, ['7'])).toBe(
            true
        );
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('7') }, [7 as unknown as string])).toBe(true);
    });

    it('shows a step whose only listed tag has since been deleted', () => {
        // A deleted tag leaves a dangling id in the jsonb. It matches no school, so the
        // step quietly goes back to being visible rather than breaking.
        expect(isStepHiddenForSchoolTags({ id: '1', ...hideForTags('deleted-tag-id') }, ['7', '8'])).toBe(false);
    });

    it('does not care which step type it is applied to', () => {
        expect(isStepHiddenForSchoolTags({ id: '1', stepType: 'TEXT_AND_IMAGE', ...hideForTags('7') }, ['7'])).toBe(true);
    });
});

describe('isSetByTeacherStepReady', () => {
    it('treats any non set-by-teacher step as ready', () => {
        expect(isSetByTeacherStepReady({ id: '1', stepType: 'VIDEO' }, {})).toBe(true);
        expect(isSetByTeacherStepReady({ id: '1', stepType: 'VIDEO' }, null)).toBe(true);
    });

    it('is ready once the teacher has uploaded media', () => {
        expect(isSetByTeacherStepReady({ id: '1', stepType: 'SET_BY_TEACHER' }, { '1': { filename: 'photo.jpg' } })).toBe(true);
    });

    it('is not ready when there is no media for the step', () => {
        expect(isSetByTeacherStepReady({ id: '1', stepType: 'SET_BY_TEACHER' }, {})).toBe(false);
        expect(isSetByTeacherStepReady({ id: '1', stepType: 'SET_BY_TEACHER' }, { '2': { filename: 'other.jpg' } })).toBe(false);
    });

    it('is not ready when a media entry exists but carries no filename', () => {
        expect(isSetByTeacherStepReady({ id: '1', stepType: 'SET_BY_TEACHER' }, { '1': { filename: null } })).toBe(false);
    });
});

describe('filterStepsForViewer', () => {
    const video = { id: 'v', stepType: 'VIDEO', ...hideForTags('7') };
    const text = { id: 't', stepType: 'TEXT_AND_IMAGE' };
    const sbt = { id: 's', stepType: 'SET_BY_TEACHER' };

    it('returns an empty list for missing steps', () => {
        expect(filterStepsForViewer(null)).toEqual([]);
        expect(filterStepsForViewer(undefined)).toEqual([]);
        expect(filterStepsForViewer([])).toEqual([]);
    });

    it('hides the video step from a school carrying the tag, keeping the others', () => {
        expect(filterStepsForViewer([video, text], { schoolTagIds: ['7'] })).toEqual([text]);
    });

    it('keeps the video step for a school that does not carry the tag', () => {
        expect(filterStepsForViewer([video, text], { schoolTagIds: ['9'] })).toEqual([video, text]);
    });

    it('keeps the video step when no school tags are supplied at all', () => {
        // This is the admin and teacher preview case: no school in view, so tag rules
        // must never hide anything.
        expect(filterStepsForViewer([video, text])).toEqual([video, text]);
    });

    it('applies the tag rule and the set-by-teacher rule together', () => {
        const steps = [video, text, sbt];

        expect(filterStepsForViewer(steps, { schoolTagIds: ['7'], sbtMediaByStepId: {} })).toEqual([text]);
        expect(filterStepsForViewer(steps, { schoolTagIds: ['7'], sbtMediaByStepId: { s: { filename: 'a.jpg' } } })).toEqual([text, sbt]);
        expect(filterStepsForViewer(steps, { schoolTagIds: ['9'], sbtMediaByStepId: { s: { filename: 'a.jpg' } } })).toEqual([
            video,
            text,
            sbt
        ]);
    });

    it('preserves the original step order', () => {
        const a = { id: 'a', stepType: 'TEXT_AND_IMAGE' };
        const b = { id: 'b', stepType: 'VIDEO', ...hideForTags('7') };
        const c = { id: 'c', stepType: 'TEXT_AND_IMAGE' };

        expect(filterStepsForViewer([a, b, c], { schoolTagIds: ['9'] })).toEqual([a, b, c]);
        expect(filterStepsForViewer([a, b, c], { schoolTagIds: ['7'] })).toEqual([a, c]);
    });

    it('applies the tag rule to every step type there is', () => {
        // The rule is offered on every step in the admin editor, so nothing here may be
        // step type specific. Listed out in full rather than looped over an import so that
        // adding a step type to the enum without thinking about visibility is a failing
        // test rather than a silent gap.
        const allStepTypes = [
            'TEXT_AND_IMAGE',
            'DOWNLOAD',
            'LINK',
            'DICE',
            'INFANT_FONT',
            'TEXT_CAROUSEL',
            'IMAGE_CAROUSEL',
            'MODAL_WITH_CLICKABLE_ALPHABET',
            'TABLE',
            'MODAL',
            'TEXTDICE',
            'IMAGEDICE',
            'TIMER',
            'VIDEO',
            'EDITOR',
            'IMAGE',
            'STOPWATCH',
            'AUDIO',
            'TABS',
            'DIGITAL_CHECKLIST',
            'ACCORDION',
            'TEXT_ONLY_DIGITAL_CHECKLIST',
            'CAROUSEL',
            'SET_BY_TEACHER'
        ];

        const steps = allStepTypes.map((stepType) => ({ id: stepType, stepType, ...hideForTags('7') }));
        const sbtMediaByStepId = { SET_BY_TEACHER: { filename: 'a.jpg' } };

        expect(filterStepsForViewer(steps, { schoolTagIds: ['7'], sbtMediaByStepId })).toEqual([]);
        expect(filterStepsForViewer(steps, { schoolTagIds: ['9'], sbtMediaByStepId })).toEqual(steps);
    });

    it('does not mutate the steps it is given', () => {
        const steps = [video, text];

        filterStepsForViewer(steps, { schoolTagIds: ['7'] });

        expect(steps).toEqual([video, text]);
    });
});
