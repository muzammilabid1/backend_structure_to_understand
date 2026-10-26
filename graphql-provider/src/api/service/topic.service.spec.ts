import { SubjectProgrammeType } from 'lwp-shared';

import { allowedProgrammeTypesForClass, ClassProgrammeEntitlementFields } from './topic.service';

/**
 * Programme entitlement decides both which topics a teacher may schedule and which sequences a
 * leader may assign, so these cases pin the rule down for both.
 */
describe('allowedProgrammeTypesForClass', () => {
    const classWith = (fields: Partial<ClassProgrammeEntitlementFields> = {}): ClassProgrammeEntitlementFields => ({
        isFullProgramme: false,
        isReadyTeddyEnabled: false,
        IsReadingLogsEnabled: false,
        isRegistrationClass: false,
        isGroupAcrossClasses: false,
        school: { isMoneySkillsAvailable: false },
        ...fields
    });

    it('entitles a class to nothing when every flag is off', () => {
        expect(allowedProgrammeTypesForClass(classWith())).toEqual([]);
    });

    describe('full programme', () => {
        it('follows the per-class isFullProgramme flag', () => {
            expect(allowedProgrammeTypesForClass(classWith({ isFullProgramme: true }))).toContain(SubjectProgrammeType.FULL_PROGRAMME);
        });
    });

    describe('ready teddy', () => {
        it('follows the per-class isReadyTeddyEnabled flag, not a school-level one', () => {
            expect(allowedProgrammeTypesForClass(classWith({ isReadyTeddyEnabled: true }))).toEqual([SubjectProgrammeType.READY_TEDDY]);
        });

        it('is withheld when the class has it switched off', () => {
            expect(allowedProgrammeTypesForClass(classWith())).not.toContain(SubjectProgrammeType.READY_TEDDY);
        });
    });

    describe('money skills', () => {
        it('needs the school flag, so is withheld without it however the class is set up', () => {
            expect(
                allowedProgrammeTypesForClass(classWith({ isRegistrationClass: true, IsReadingLogsEnabled: true, isFullProgramme: true }))
            ).not.toContain(SubjectProgrammeType.MONEY_SKILLS);
        });

        it('is granted to a registration class with reading logs enabled', () => {
            expect(
                allowedProgrammeTypesForClass(
                    classWith({
                        isRegistrationClass: true,
                        IsReadingLogsEnabled: true,
                        school: { isMoneySkillsAvailable: true }
                    })
                )
            ).toContain(SubjectProgrammeType.MONEY_SKILLS);
        });

        it('is granted to a group-across-classes class with reading logs enabled', () => {
            expect(
                allowedProgrammeTypesForClass(
                    classWith({
                        isGroupAcrossClasses: true,
                        IsReadingLogsEnabled: true,
                        school: { isMoneySkillsAvailable: true }
                    })
                )
            ).toContain(SubjectProgrammeType.MONEY_SKILLS);
        });

        it('is withheld from a registration class without reading logs', () => {
            expect(
                allowedProgrammeTypesForClass(classWith({ isRegistrationClass: true, school: { isMoneySkillsAvailable: true } }))
            ).not.toContain(SubjectProgrammeType.MONEY_SKILLS);
        });

        it('is granted to a full programme class regardless of registration or reading logs', () => {
            expect(allowedProgrammeTypesForClass(classWith({ isFullProgramme: true, school: { isMoneySkillsAvailable: true } }))).toEqual([
                SubjectProgrammeType.FULL_PROGRAMME,
                SubjectProgrammeType.MONEY_SKILLS
            ]);
        });
    });

    it('can grant every programme at once', () => {
        expect(
            allowedProgrammeTypesForClass(
                classWith({
                    isFullProgramme: true,
                    isReadyTeddyEnabled: true,
                    school: { isMoneySkillsAvailable: true }
                })
            )
        ).toEqual([SubjectProgrammeType.FULL_PROGRAMME, SubjectProgrammeType.READY_TEDDY, SubjectProgrammeType.MONEY_SKILLS]);
    });

    it('drops money skills when the school relation was not loaded', () => {
        const withoutSchool = { ...classWith({ isFullProgramme: true }), school: undefined } as ClassProgrammeEntitlementFields;

        expect(allowedProgrammeTypesForClass(withoutSchool)).toEqual([SubjectProgrammeType.FULL_PROGRAMME]);
    });
});
