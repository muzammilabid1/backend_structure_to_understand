import { useMutation } from '@apollo/client';
import { FormControl, FormControlLabel, Radio, RadioGroup, TableCell, TableRow } from '@mui/material';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { changeClassPupilsPremium } from '../../../graphQl/mutations';
import { getClassPupilsForTeacher } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonTable from './../../Shared/CommonTable';
import DialogWrapper from './../../Shared/DialogWrapper';
import Paragraph from './../../Shared/Typography/Paragraph';

const EditClassDetailModal = ({ open, setOpen, data, subHeading }) => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const [pupilPremiumStatus, setPupilPremiumStatus] = useState([]);

    const [changeClassPupilsPremiumMutation, { loading }] = useMutation(changeClassPupilsPremium, {
        refetchQueries: [{ query: getClassPupilsForTeacher, variables: { classId: queryParams?.class_id } }],
        awaitRefetchQueries: true
    });

    const handleCheckOption = (value, index) => {
        let updatedPremiumState = [...pupilPremiumStatus];

        updatedPremiumState[index]['isPremium'] = eval(value);
        setPupilPremiumStatus(updatedPremiumState);
    };

    useEffect(() => {
        if (data?.length) {
            setPupilPremiumStatus([...data].map((item) => ({ ...item })));
        }
    }, [data]);

    const head = ['First name', 'Last name', '', '', 'Are they Pupil Premium?'];

    return (
        <DialogWrapper
            className="edit-class-detail-modal"
            heading={'Pupil Premium status'}
            open={open}
            setOpen={setOpen}
            dialogFooter
            primaryBtnText="Update details"
            primaryBtnloading={loading}
            primaryBtnDisabled={pupilPremiumStatus.find((item) => item.isPremium == null)}
            primaryBtnHandler={() => {
                changeClassPupilsPremiumMutation({
                    variables: { input: pupilPremiumStatus.map((child) => ({ isPremium: child.isPremium, id: child.id })) }
                })
                    .then(() => {
                        callSnackbar('Changes saved', 'success');
                        setOpen(false);
                    })
                    .catch((erorr) => callSnackbar(erorr, 'error'));
            }}
            contentWidth={'660px'}>
            <Paragraph text={subHeading} />

            <CommonTable head={head} pagination={false}>
                {(pupilPremiumStatus || []).map((child, index) => (
                    <TableRow key={child.id} className={child.isPremium == null ? 'null_status' : ''}>
                        <TableCell>
                            <Paragraph text={child.firstname} />
                        </TableCell>
                        <TableCell>
                            <Paragraph text={child.lastname} />
                        </TableCell>

                        <TableCell />
                        <TableCell />

                        <TableCell>
                            <FormControl component="fieldset">
                                <RadioGroup
                                    row
                                    aria-label="position"
                                    name="position"
                                    onChange={(e, value) => {
                                        handleCheckOption(value, index);
                                    }}>
                                    <FormControlLabel
                                        control={<Radio color="primary" />}
                                        label="Yes"
                                        value={true}
                                        checked={child?.isPremium}
                                    />
                                    <FormControlLabel
                                        checked={child?.isPremium === false ? true : false}
                                        control={<Radio color="primary" />}
                                        value={false}
                                        label="No"
                                    />
                                </RadioGroup>
                            </FormControl>
                        </TableCell>
                    </TableRow>
                ))}
            </CommonTable>
        </DialogWrapper>
    );
};

EditClassDetailModal.propTypes = {
    data: PropTypes.array.isRequired,
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    subHeading: PropTypes.string
};
EditClassDetailModal.defaultProps = {
    data: [],
    subHeading: ''
};

export default EditClassDetailModal;
