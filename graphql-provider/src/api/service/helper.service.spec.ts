import { normaliseSchoolYear } from 'src/api/service/helper.service';

describe('normaliseSchoolYear', () => {
    test.each`
        input            | expected
        ${'reception'}   | ${0}
        ${'ReCePtIon'}   | ${0}
        ${' ReCePtIon '} | ${0}
        ${'r'}           | ${0}
        ${'R'}           | ${0}
        ${' R '}         | ${0}
        ${'-2'}          | ${-2}
        ${'-1'}          | ${-1}
        ${'0'}           | ${0}
        ${'1'}           | ${1}
        ${'2'}           | ${2}
        ${'3'}           | ${3}
        ${'4'}           | ${4}
        ${'5'}           | ${5}
        ${'6'}           | ${6}
        ${'7'}           | ${7}
        ${'8'}           | ${8}
        ${'9'}           | ${9}
        ${'10'}          | ${10}
        ${'11'}          | ${11}
        ${'12'}          | ${12}
        ${'13'}          | ${13}
        ${'nursery'}     | ${-1}
        ${'n1'}          | ${-2}
        ${'n2'}          | ${-1}
        ${'e1'}          | ${-2}
        ${'e2'}          | ${-1}
        ${'(0)'}         | ${0}
        ${' (1)'}        | ${1}
        ${'(2) '}        | ${2}
        ${''}            | ${-999}
        ${' '}           | ${-999}
        ${'fish'}        | ${-999}
    `('normalises imported nc_year values correctly', ({ input, expected }) => {
        expect(normaliseSchoolYear(input)).toBe(expected);
    });
});
