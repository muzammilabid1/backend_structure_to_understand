import { useMutation, useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { linkPupilToWondePupil } from '../../../graphQl/mutations';
import { getClassPupilsForSimsLinking, getClassPupilsForTeacher, getImportedSchoolPupilsForSimsLinking } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../CommonLoading';
import CommonSelectField from '../CommonSelectField';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

/**
 * The single "link pupils to MIS" modal for the whole app.
 *
 * Two ways to feed it, because the two call sites already had the data in different shapes:
 *   - pass `lwpPupils` + `importedStudents` (admin class screen, which has them to hand), or
 *   - pass `schoolId` and it fetches both itself (teacher class screen).
 */
const NOT_IN_MIS = 'not_in_mis';

interface LwpPupil {
    id: string;
    fullname: string;
    importedStudent?: { id: string } | null;
}

interface MisPupil {
    id: string;
    forename?: string;
    surname?: string;
    importedClassName?: string;
    importedClassYearGroup?: string;
}

interface SelectedValue {
    importedStudentId?: string;
    lwpPupilId?: string;
    selectedIndex: number;
    lwpPupilName?: string;
}

export interface LinkPupilsToSimsModalProps {
    toggle: () => void;
    subHeading: string;
    schoolMisIntegrationVariable: string;
    classId: string | string[];
    /** Pass this to fetch both lists here instead of supplying them as props. */
    schoolId?: string;
    lwpPupils?: LwpPupil[];
    importedStudents?: MisPupil[];
    /** Drop pupils that are already linked to a MIS pupil. See the comment by `pupils` below. */
    hideLinkedPupils?: boolean;
    open?: boolean;
}

const LinkPupilsToSimsModal = ({
    toggle,
    subHeading,
    schoolMisIntegrationVariable,
    classId,
    schoolId,
    lwpPupils,
    importedStudents,
    hideLinkedPupils = false,
    open = true
}: LinkPupilsToSimsModalProps) => {
    const [selectedValue, setSelectedValue] = useState<SelectedValue[]>([]);
    const [linkPupilToWondePupilMutation, { loading: linkPupilToWondePupilLoading }] = useMutation(linkPupilToWondePupil);
    const { callSnackbar } = useContext(ThemeContext);

    const selfFetch = !!schoolId;

    const {
        error: importedStudentsError,
        loading: importedStudentsLoading,
        data: importedStudentsData
    } = useQuery(getImportedSchoolPupilsForSimsLinking, { variables: { id: schoolId }, skip: !selfFetch });

    const {
        error: lwpPupilsError,
        loading: lwpPupilsLoading,
        data: lwpPupilsData
    } = useQuery(getClassPupilsForSimsLinking, { variables: { classId }, skip: !selfFetch });

    useEffect(() => {
        if (importedStudentsError?.message) {
            callSnackbar(importedStudentsError, 'error');
        }

        if (lwpPupilsError?.message) {
            callSnackbar(lwpPupilsError, 'error');
        }
    }, [importedStudentsError, lwpPupilsError]);

    const loading = selfFetch && (importedStudentsLoading || lwpPupilsLoading);

    const allPupils: LwpPupil[] = (selfFetch ? lwpPupilsData?.getClassPupils : lwpPupils) || [];
    const misPupils: MisPupil[] = (selfFetch ? importedStudentsData?.getImportedSchoolPupils : importedStudents) || [];

    // The teacher screen hides pupils that are already linked; the admin screen lists them with
    // their link preselected. Both behaviours are preserved as-is so this stays a pure dedupe -
    // raised in the PR as a question. If the two screens should agree, drop this prop.
    const pupils = hideLinkedPupils ? allPupils.filter((pupil) => !pupil.importedStudent) : allPupils;

    const head = ['Pupil name', `Student profile in ${schoolMisIntegrationVariable}`];

    useEffect(() => {
        if (loading) return;

        const initialValues: SelectedValue[] = pupils.map((item, i) => ({
            importedStudentId: item.importedStudent?.id,
            lwpPupilId: item.id,
            selectedIndex: i,
            lwpPupilName: item.fullname
        }));

        misPupils.forEach((ws) =>
            initialValues.forEach((v) => {
                if (
                    !v.importedStudentId &&
                    `${ws.forename?.toLowerCase()} ${ws.surname?.toLowerCase()}` === v.lwpPupilName?.toLowerCase()
                ) {
                    v.importedStudentId = ws.id;
                }
            })
        );

        setSelectedValue(initialValues);
    }, [lwpPupils, importedStudents, lwpPupilsData, importedStudentsData, loading]);

    const _onSubmit = () => {
        // NOTE: 'not_in_mis' is truthy, so picking "Not in <MIS>" sends that literal string as an
        // importedStudentId. Pre-existing in both copies of this modal - left alone here to keep
        // the dedupe behaviour-neutral, raised in the PR.
        const linkPupilInputs = selectedValue
            .filter((item) => item.importedStudentId && item.lwpPupilId)
            .map((i) => ({
                importedStudentId: i.importedStudentId,
                lwpPupilId: i.lwpPupilId
            }));

        linkPupilToWondePupilMutation({
            variables: { input: { linkPupilInputs } },
            refetchQueries: [
                {
                    query: getClassPupilsForTeacher,
                    variables: { classId }
                }
            ]
        })
            .then(() => {
                toggle();
                callSnackbar('Changes saved', 'success');
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const _onChange = (importedStudentId, lwpPupilId, selectedIndex) => {
        if (!selectedValue.length) {
            setSelectedValue([{ importedStudentId, lwpPupilId, selectedIndex }]);
        }

        const isSelected = selectedValue.length && !!selectedValue.find((i) => i.selectedIndex === selectedIndex);

        if (isSelected) {
            const newArr = [...selectedValue];

            newArr.splice(selectedIndex, 1, { importedStudentId, lwpPupilId, selectedIndex });
            setSelectedValue(newArr);
        } else {
            setSelectedValue([...selectedValue, { importedStudentId, lwpPupilId, selectedIndex }]);
        }
    };

    const _getSelectedValue = (index) => {
        const item = selectedValue.find((i) => i.selectedIndex === index);

        return item?.importedStudentId == undefined ? NOT_IN_MIS : item?.importedStudentId;
    };

    return (
        <DialogWrapper
            primaryBtnHandler={_onSubmit}
            onClose={toggle}
            heading={`Link pupils to ${schoolMisIntegrationVariable}`}
            subHeading={subHeading}
            primaryBtnloading={linkPupilToWondePupilLoading}
            dialogFooter
            // DialogWrapper caps the dialog at 484px by default, which is narrower than this two-column
            // table needs once a MIS option reads like "Forename Surname (Year 10 - 10ABC)" - so it always
            // scrolled, at every screen size.
            contentWidth="900px"
            open={open}
            setOpen={toggle}
            primaryBtnText={'Link pupils'}
            cancelBtn>
            {loading ? (
                <CommonLoading />
            ) : (
                <CommonTable head={head}>
                    {pupils.map((lwpPupil, index) => (
                        <TableRow key={lwpPupil.id}>
                            <TableCell>
                                <Paragraph text={lwpPupil.fullname} />
                            </TableCell>
                            <TableCell>
                                <CommonSelectField
                                    label={`Select pupil in ${schoolMisIntegrationVariable}`}
                                    options={misPupils
                                        .map((i) => ({
                                            value: `${i?.forename} ${i?.surname} ${
                                                i?.importedClassYearGroup && i?.importedClassName
                                                    ? `(Year ${i?.importedClassYearGroup} - ${i?.importedClassName})`
                                                    : ''
                                            }`,
                                            key: i?.id
                                        }))
                                        .concat([{ value: `Not in ${schoolMisIntegrationVariable}`, key: NOT_IN_MIS }])}
                                    value={_getSelectedValue(index)}
                                    onChange={(e) => _onChange(e.target.value, lwpPupil.id, index)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </CommonTable>
            )}
        </DialogWrapper>
    );
};

export default LinkPupilsToSimsModal;
