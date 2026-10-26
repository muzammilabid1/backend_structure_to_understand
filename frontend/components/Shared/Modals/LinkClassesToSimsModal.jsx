import { useMutation } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { linkLwpClassToWondeClass } from '../../../graphQl/mutations';
import { getSchoolClassForAdmin, getSchoolForSchoolDetailsForTeacher } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonSelectField from '../CommonSelectField';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const LinkClassesToSimsModal = ({ toggle, lwpClasses, wondeClasses, subHeading, schoolMisIntegrationVariable, schoolId }) => {
    let [selectedValue, setSelectedValue] = useState([]);
    const [linkLwpClassToWondeClassMutation, { loading: linkLwpClassToWondeClassLoading }] = useMutation(linkLwpClassToWondeClass);
    const { callSnackbar } = useContext(ThemeContext);

    const head = ['Class name', `Class profile in ${schoolMisIntegrationVariable}`];

    useEffect(() => {
        const initialValues = lwpClasses
            ?.filter((item) => item.isRegistrationClass)
            ?.map((item, i) => {
                return {
                    importedSchoolClassId: item.importedSchoolClass?.id,
                    lwpSchoolClassId: item.id,
                    selectedIndex: i,
                    lwpSchoolClassName: item.name
                };
            });

        ////“Link classes” modal on admin school details page should start off showing the existing linked classes and should not guess links based on class names
        // wondeClasses?.map((wc) =>
        //     initialValues?.map((v) => {
        //         if (!v.importedSchoolClassId && wc.name.toLowerCase() === v.lwpSchoolClassName.toLowerCase()) {
        //             v.importedSchoolClassId = wc.id;
        //         }
        //     })
        // );

        setSelectedValue(initialValues);
    }, [lwpClasses]);

    const _onSubmit = () => {
        const linkClassInputs = selectedValue
            .filter((item) => item.importedSchoolClassId && item.lwpSchoolClassId)
            .map((i) => ({
                importedSchoolClassId: i.importedSchoolClassId,
                lwpSchoolClassId: i.lwpSchoolClassId
            }));

        linkLwpClassToWondeClassMutation({
            variables: { input: { linkClassInputs } },
            refetchQueries: [
                {
                    query: getSchoolClassForAdmin,
                    variables: { schoolId }
                },
                {
                    query: getSchoolForSchoolDetailsForTeacher,
                    variables: { id: schoolId }
                }
            ],
            awaitRefetchQueries: true
        })
            .then(() => {
                toggle();
                callSnackbar('Changes saved', 'success');
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const _onChange = (importedSchoolClassId, lwpSchoolClassId, selectedIndex) => {
        !selectedValue.length && setSelectedValue([{ importedSchoolClassId, lwpSchoolClassId, selectedIndex }]);

        const isSelected = selectedValue.length && !!selectedValue.find((i) => i.selectedIndex === selectedIndex);

        if (isSelected) {
            const newArr = [...selectedValue];

            newArr.splice(selectedIndex, 1, { importedSchoolClassId, lwpSchoolClassId, selectedIndex });
            setSelectedValue(newArr);
        } else {
            setSelectedValue([...selectedValue, { importedSchoolClassId, lwpSchoolClassId, selectedIndex }]);
        }
    };

    const _getSelectedValue = (index) => {
        const item = selectedValue.find((i) => i.selectedIndex === index);

        return item?.importedSchoolClassId == undefined ? 'not_in_mis' : item?.importedSchoolClassId;
    };

    return (
        <DialogWrapper
            primaryBtnHandler={_onSubmit}
            onClose={toggle}
            heading={`Link classes to ${schoolMisIntegrationVariable}`}
            contentWidth="900px"
            subHeading={subHeading}
            primaryBtnloading={linkLwpClassToWondeClassLoading}
            dialogFooter
            open={open}
            setOpen={toggle}
            primaryBtnText={'Link classes'}
            cancelBtn>
            <CommonTable head={head}>
                {(lwpClasses || [])
                    ?.filter((item) => item.isRegistrationClass)
                    .map((lwpClass, index) => (
                        <TableRow key={lwpClass.id}>
                            <TableCell>
                                <Paragraph text={lwpClass.name} />
                            </TableCell>
                            <TableCell>
                                <CommonSelectField
                                    label={`Select class in ${schoolMisIntegrationVariable}`}
                                    options={(wondeClasses || [])
                                        .map((i) => ({ value: i.name, key: i.id }))
                                        .concat([{ value: `Not in ${schoolMisIntegrationVariable}`, key: 'not_in_mis' }])}
                                    value={_getSelectedValue(index)}
                                    onChange={(e) => _onChange(e.target.value, lwpClass.id, index)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
            </CommonTable>
        </DialogWrapper>
    );
};

LinkClassesToSimsModal.propTypes = {
    toggle: PropTypes.func.isRequired,
    lwpClasses: PropTypes.array.isRequired,
    wondeClasses: PropTypes.array.isRequired,
    subHeading: PropTypes.string.isRequired,
    schoolMisIntegrationVariable: PropTypes.string.isRequired,
    schoolId: PropTypes.number.isRequired
};

export default LinkClassesToSimsModal;
