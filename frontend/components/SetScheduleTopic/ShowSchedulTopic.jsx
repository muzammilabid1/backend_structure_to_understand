import { useQuery } from '@apollo/client';
import { TableCell, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getClassTopics } from '../../graphQl/queries';
import { getTopicType, showDate, ThemeContext } from '../../shared/Services/handler';
import CommonLoading from '../Shared/CommonLoading';
import CommonTable from '../Shared/CommonTable';
import DialogWrapper from '../Shared/DialogWrapper';
import Heading2 from '../Shared/Typography/Heading2';
import Paragraph from '../Shared/Typography/Paragraph';

const ShowSchedulTopic = ({ open, setOpen }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading,
        error: error,
        data: classTopics
    } = useQuery(getClassTopics, {
        variables: { classId: open?.id },
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    let heading = ['Date', 'Topic name'];

    if (loading) return <CommonLoading />;

    return (
        <div>
            <DialogWrapper
                open={open?.open}
                setOpen={() => setOpen({ open: !open })}
                secondaryBtn={'Close'}
                contentWidth={'1044px'}
                secondaryBtnHandler={() => setOpen({ open: !open })}
                className={'set_topic_modal'}
                dialogFooter>
                <div className="set_topic_class_table">
                    <Heading2 text="Past and scheduled topics" />
                    <Paragraph text={open?.name} />

                    <br />
                    <CommonTable head={heading} sx={{ maxHeight: 440 }}>
                        {(classTopics?.getClassTopics || [])
                            .filter((i) => !i?.topic?.isReading)
                            .map((topic) => {
                                return (
                                    <TableRow key={topic?.id} width="250">
                                        <TableCell className={`${getTopicType(false)}-border`} width="250">
                                            <Paragraph
                                                text={`${showDate({ date: topic?.releaseDate, short: true })} ${
                                                    topic?.dueDate ? 'to ' + showDate({ date: topic?.dueDate, short: true }) : ''
                                                }`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Paragraph text={topic?.topic?.teacherTopicName} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                    </CommonTable>
                </div>
            </DialogWrapper>
        </div>
    );
};

ShowSchedulTopic.propTypes = {
    setOpen: PropTypes.func.isRequired,
    open: PropTypes.object.isRequired
};

export default ShowSchedulTopic;
