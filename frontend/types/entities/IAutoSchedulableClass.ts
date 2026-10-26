/**
 * One class offered by the Topic library's auto-schedule picker.
 *
 * The API only returns classes that can actually be scheduled, so there is no eligibility flag here
 * to check: every entry leads to a class auto-schedule page that has something to offer.
 */
export interface IAutoSchedulableClass {
    id: string;
    /** Already prefixed with the period where the class is not from the school's current year. */
    name: string;
    /** The year group's display name, shown beside the class name. */
    year: string;
    /**
     * Whether the viewer teaches this class. Always true for a teacher, who is only offered their
     * own; a leader is offered all of them and the picker groups theirs first.
     */
    isMyClass: boolean;
}
