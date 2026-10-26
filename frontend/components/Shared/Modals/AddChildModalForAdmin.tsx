import React from 'react';

import AddPupilToASchoolClass from '../../Class/AddPupil';
import DialogWrapper from '../DialogWrapper';

declare global {
    interface Window {
        newrelic?: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            noticeError: (error: Error, options?: { [key: string]: any }) => void;
        };
    }
}

interface AddChildModalForTeacherProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const AddChildModalForAdmin = ({ open, setOpen }: AddChildModalForTeacherProps) => {
    return (
        <DialogWrapper open={open} setOpen={setOpen} contentWidth="780px" className="add-child-modal-for-admin">
            <AddPupilToASchoolClass isAdminSide setOpen={setOpen} />
        </DialogWrapper>
    );
};

export default AddChildModalForAdmin;
