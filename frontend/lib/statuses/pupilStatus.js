import { PupilStatus } from '../../shared/Constant';

const pupilStatuses = {
    [PupilStatus.ACTIVE]: {
        name: 'Active this term',
        description: 'Added a reading log entry, watched a video or completed an activity this term.',
        colour: '#99C95D'
    },
    [PupilStatus.REGISTERED]: {
        name: 'Accessed the site',
        description:
            'A parent is linked but they have not yet added a reading log entry, watched a video or completed an activity this term.',
        colour: '#C6DD84'
    },
    [PupilStatus.MISSING]: {
        name: 'No linked parent',
        description: 'No parent has started using the site with this pupil yet. Please check parent details to find out more.',
        colour: '#FAF3B3'
    }
};

/**
 * getProgressBarStats takes in an {@link SchoolClassStatistics} object
 * and returns `data` and `presentaton`, with `data` being the progress
 * bar data for the class and `presentaton` being the contextual information.
 *
 * @export
 * @param {SchoolClassStatistics} stats the school class' stats information
 * @return {{data: {color: string, count: number}[], presentation: {color: string, text: string, popOverText: string}[]}}
 */
export function getProgressBarStats(stats) {
    return {
        data:
            stats?.active + stats?.registered == 0
                ? [{ color: pupilStatuses[PupilStatus.MISSING].colour, count: 1, status: PupilStatus.MISSING }]
                : [
                      { color: pupilStatuses[PupilStatus.ACTIVE].colour, count: stats?.active, status: PupilStatus.ACTIVE },
                      { color: pupilStatuses[PupilStatus.REGISTERED].colour, count: stats?.registered, status: PupilStatus.REGISTERED },
                      { color: pupilStatuses[PupilStatus.MISSING].colour, count: stats?.missing, status: PupilStatus.MISSING }
                  ],
        presentation: [PupilStatus.ACTIVE, PupilStatus.REGISTERED, PupilStatus.MISSING].map((statusName) => {
            return {
                color: pupilStatuses[statusName].colour,
                text: `${pupilStatuses[statusName].name} (${stats?.[statusName.toLowerCase()]})`,
                popOverText: pupilStatuses[statusName].description
            };
        })
    };
}

export function getPupilStatusDescription(pupilStatus) {
    return pupilStatuses[pupilStatus]?.description;
}

export function getPupilStatusName(pupilStatus) {
    return pupilStatuses[pupilStatus]?.name;
}
