import DataLoader from 'dataloader';

import { LwpSchool } from '../entities/school';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { SchoolResolver } from './school.resolver';

describe('SchoolResolver.tagIds', () => {
    // tagIds reads only from the loader, so none of the injected services are needed here.
    const resolver = new SchoolResolver(null, null, null, null, null, null, null, null);

    const school = { id: 'school-1' } as LwpSchool;

    const loaderYielding = (tags: Partial<StaticLwpSchoolTag>[] | null): DataLoader<string, StaticLwpSchoolTag[]> =>
        ({ load: () => Promise.resolve(tags) }) as unknown as DataLoader<string, StaticLwpSchoolTag[]>;

    it('returns the ids of the tags on the school', async () => {
        await expect(resolver.tagIds(school, loaderYielding([{ id: '7' }, { id: '8' }]))).resolves.toEqual(['7', '8']);
    });

    it('returns an empty list for a school with no tags', async () => {
        await expect(resolver.tagIds(school, loaderYielding([]))).resolves.toEqual([]);
    });

    it('returns an empty list rather than throwing when the loader yields nothing', async () => {
        await expect(resolver.tagIds(school, loaderYielding(null))).resolves.toEqual([]);
    });

    it('exposes ids only, never names, colours, or the schools attached to a tag', async () => {
        // Unlike the sibling `tags` field, this one is readable by parents. If it ever
        // started returning whole tag objects it would leak internal segmentation labels
        // and, worse, which other schools carry them.
        const result = await resolver.tagIds(
            school,
            loaderYielding([
                {
                    id: '7',
                    name: 'Autumn cohort',
                    color: '#FF0000',
                    schools: [{ id: 'some-other-school' }]
                } as Partial<StaticLwpSchoolTag>
            ])
        );

        expect(result).toEqual(['7']);
        expect(JSON.stringify(result)).not.toContain('Autumn cohort');
        expect(JSON.stringify(result)).not.toContain('#FF0000');
        expect(JSON.stringify(result)).not.toContain('some-other-school');
    });
});
