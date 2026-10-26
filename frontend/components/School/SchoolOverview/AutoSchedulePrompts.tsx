import { useRouter } from 'next/compat/router';
import React from 'react';

import { IWholeSchoolAutoScheduleProgramme } from '../../../types/entities/IWholeSchoolSequencePreview';
import ProgrammeBanner from '../WholeSchoolAutoSchedule/ProgrammeBanner';

/**
 * Prompts a leader to auto-schedule each programme their school is entitled to, has published
 * content for, and has not yet scheduled this year (LEA-6688).
 *
 * **Nothing is stored and there is deliberately no dismiss X**, although the design draws one: the
 * prompt stays until the school acts, then the query stops returning it.
 *
 * The school overview fetches the prompts and passes them in, because the Money Skills welcome modal
 * (LEA-6505) shows on the same answer, so the page asks once for both.
 */
const AutoSchedulePrompts = ({ schoolId, prompts }: { schoolId: string; prompts: IWholeSchoolAutoScheduleProgramme[] }) => {
    const router = useRouter();

    return (
        <>
            {prompts.map((programme) => (
                <ProgrammeBanner
                    key={programme.subjectId}
                    programme={programme}
                    text={`Auto-schedule ${programme.subjectName} topics for your classes`}
                    dataTest={`school-overview-auto-schedule-prompt-${programme.subjectId}`}
                    buttonDataTest={`school-overview-auto-schedule-prompt-button-${programme.subjectId}`}
                    onClick={() => router?.push(`/school/${schoolId}/auto-schedule/${programme.subjectId}`)}
                />
            ))}
        </>
    );
};

export default AutoSchedulePrompts;
