import { Index, ViewColumn, ViewEntity } from 'typeorm';

import { LogParentPupilAction } from '../log_parent_pupil_action';
/**
 * LwpViewParentPupilActionStats is a materialised view version
 * of the {@link LogParentPupilAction} table, useful for statistics
 * where it's useful to have indexed versions of the columns. We don't
 * want to index the underlying table so as to retain as fast inserts
 * as possible, given the number of things that are recorded into that table.
 *
 * @export
 * @class LwpViewParentPupilActionStats
 */
@ViewEntity({
    expression: `select "actionId", "userId", "parentId", "pupilId", param1, param2, param3, time, id from log_parent_pupil_action`,
    materialized: true,
    dependsOn: [LogParentPupilAction]
})
@Index(['actionId', 'param2'])
@Index(['pupilId', 'parentId'])
export class LwpViewParentPupilActionStats {
    @ViewColumn()
    actionId: number;

    @ViewColumn()
    @Index()
    userId: string;

    @ViewColumn()
    parentId?: string;

    @ViewColumn()
    pupilId?: string;

    @ViewColumn()
    param1?: string;

    @ViewColumn()
    param2?: string;

    @ViewColumn()
    param3?: number;

    @ViewColumn()
    @Index()
    time?: Date;

    @ViewColumn()
    @Index({ unique: true })
    id?: string;
}
