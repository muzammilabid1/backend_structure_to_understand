import { useMutation } from '@apollo/client';
import gql from 'graphql-tag';

import sharedJson from './../../../shared/json/index.json';
import ConfirmationModal from './ConfirmationModal';

const updateClassReadingWeekStartDay = gql`
    mutation updateClassReadingWeekStartDay($classId: String!, $newReadingStartDay: Float!) {
        updateClassReadingWeekStartDay(classId: $classId, newReadingStartDay: $newReadingStartDay)
    }
`;

export default function UpdateReadingWeekStartDayModal({ classId, newReadingWeekStartDay, onSuccess, onCancel, schoolClassName }: Props) {
    const [updateClassReadingWeekStartDayMutation, { loading }] = useMutation(updateClassReadingWeekStartDay);

    return (
        <ConfirmationModal
            open
            onConfirm={() => {
                updateClassReadingWeekStartDayMutation({
                    variables: {
                        classId: classId.toString(),
                        newReadingStartDay: newReadingWeekStartDay
                    }
                }).then(() => onSuccess());
            }}
            btnText={'Confirm'}
            loading={loading}
            onCancel={onCancel}
            cancelBtnText={'Cancel'}
            primaryBtnColor={'error'}
            heading={'STOP: Are you sure?'}
            className="update-reading-week-confirmation-modal">
            <p>
                <strong>
                    You are changing <em>{schoolClassName ?? `class ID ${classId}`}</em>&apos;s reading week to{' '}
                    <em>{sharedJson?.readingDays?.find((i) => i.key == newReadingWeekStartDay.toString())?.value ?? 'an invalid day'}</em>.
                </strong>
            </p>
            <br />
            <p>
                Changing the reading week start day will reset all past weeks to have a target of zero to avoid pupils retrospectively
                missing targets after the change. <strong>This cannot be undone.</strong>
            </p>
        </ConfirmationModal>
    );
}

interface Props {
    classId: number;
    newReadingWeekStartDay: number;
    onSuccess: () => void;
    onCancel: () => void;
    schoolClassName?: string;
}
