import { useQuery } from '@apollo/client';
import { ListSubheader, Menu, MenuItem } from '@mui/material';
import { useRouter } from 'next/compat/router';
import React, { useState } from 'react';

import { IAutoSchedulableClass } from '../../../types/entities/IAutoSchedulableClass';
import LWPButton from '../../Shared/Button/LWPButton';
import { getAutoSchedulableClassesForSchool } from './queries';

interface AutoScheduleClassPickerProps {
    schoolId: string;
}

/**
 * The Auto-schedule action on the Topic library page, and the class picker it opens.
 *
 * The Topic library is where teachers already go to schedule a topic, so it is where they should be
 * able to schedule a whole sequence. Unlike the class schedule page and the school overview row, this
 * page has no class in scope, so the class is chosen here and then the existing per-class
 * auto-schedule page does the rest. Nothing about that page changes.
 *
 * **The list is scoped on the server, by who is asking.** A teacher is offered the classes they are
 * attached to; a leader or admin is offered every eligible class in the school. That is not a
 * courtesy: a teacher may read any class in their school but may only write to their own, so a wider
 * list would preview happily and then fail authorization on assign.
 *
 * **Only classes that can actually be scheduled are listed**, rather than every class with the
 * ineligible ones disabled. A class is missing because no sequence has been built for its year group,
 * which is content the teacher can neither act on nor influence, and it is the rule the rest of this
 * feature already follows: the class schedule page and the school overview row both withhold the
 * action rather than offering a dead one. The note under the list says so once, so a leader who
 * expected more classes is told why without a row per class saying it again.
 */
const AutoScheduleClassPicker = ({ schoolId }: AutoScheduleClassPickerProps) => {
    const router = useRouter();

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    /*
     * Errors are deliberately not surfaced, exactly as the class schedule page does not surface this
     * same question's: it drives an optional action, so the page it sits on still works without it,
     * and a snackbar about a feature the teacher did not come here for would be noise. A failed
     * request costs the button rather than the page.
     */
    const { data } = useQuery(getAutoSchedulableClassesForSchool, {
        variables: { schoolId },
        skip: !schoolId,
        fetchPolicy: 'cache-and-network'
    });

    const classes: IAutoSchedulableClass[] = data?.getAutoSchedulableClassesForSchool ?? [];

    const myClasses = classes.filter((schoolClass) => schoolClass.isMyClass);
    const otherClasses = classes.filter((schoolClass) => !schoolClass.isMyClass);

    // Only worth splitting when there is something on both sides of the split. A teacher only ever
    // sees their own, and a leader who teaches none of the classes gets one undivided list.
    const isGrouped = Boolean(myClasses.length && otherClasses.length);

    const openPicker = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const closePicker = () => setAnchorEl(null);

    const chooseClass = (classId: string) => {
        closePicker();
        router?.push(`/class/${classId}/auto-schedule`);
    };

    const renderClass = (schoolClass: IAutoSchedulableClass) => (
        <MenuItem
            key={schoolClass.id}
            className="auto-schedule-class-option"
            data-test={`auto-schedule-class-option-${schoolClass.id}`}
            onClick={() => chooseClass(schoolClass.id)}>
            <span className="auto-schedule-class-name">{schoolClass.name}</span>
            <span className="auto-schedule-class-year">{schoolClass.year}</span>
        </MenuItem>
    );

    /*
     * The row is always rendered, at its full height, even while the query is in flight and even when
     * the answer is nothing. The page paints before this query resolves, as it always has, so a row
     * that appeared late would shove the filters below it down by its own height at the moment
     * someone is reaching for them.
     */
    return (
        <div className="auto-schedule-entry-row" data-test="topic-library-auto-schedule-row">
            {classes.length ? (
                <LWPButton
                    id="topic-library-auto-schedule-button"
                    btnText="Auto-schedule"
                    dataTest="topic-library-auto-schedule-button"
                    onClick={openPicker}
                    color="inherit"
                    variant="text"
                    endIcon="playlist_add"
                />
            ) : null}

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closePicker}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                className="auto-schedule-class-menu"
                MenuListProps={{ 'aria-labelledby': 'topic-library-auto-schedule-button' }}>
                <ListSubheader className="auto-schedule-class-menu-heading" data-test="auto-schedule-class-menu">
                    Choose a class to auto-schedule
                </ListSubheader>

                {isGrouped
                    ? [
                          <ListSubheader key="mine" className="auto-schedule-class-group">
                              Your classes
                          </ListSubheader>,
                          ...myClasses.map(renderClass),
                          <ListSubheader key="others" className="auto-schedule-class-group">
                              Other classes
                          </ListSubheader>,
                          ...otherClasses.map(renderClass)
                      ]
                    : classes.map(renderClass)}

                <li className="auto-schedule-class-menu-note" data-test="auto-schedule-class-menu-note">
                    Only classes with a ready-made sequence for their year group are listed.
                </li>
            </Menu>
        </div>
    );
};

export default AutoScheduleClassPicker;
