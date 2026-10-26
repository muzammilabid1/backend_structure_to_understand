/**
 * How a topic sequence's dates are decided.
 *
 * FIXED - the admin sets an explicit start/end date per topic. Irregular
 * durations and gaps are allowed, and the order is derived from the dates.
 * INTERVAL - the admin sets one intervalDays for the whole sequence and
 * orders the topics explicitly. Each topic starts one interval after the previous.
 */
export enum SequenceTimingMode {
    FIXED = 'FIXED',
    INTERVAL = 'INTERVAL',
}
