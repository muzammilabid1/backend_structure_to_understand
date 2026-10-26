import { TableCell, TableRow } from '@mui/material';
import PropTypes from 'prop-types';
import { useState } from 'react';

import CommonSelectField from '../CommonSelectField';
import CommonTable from '../CommonTable';
import DialogWrapper from '../DialogWrapper';
import Paragraph from '../Typography/Paragraph';

const fnameBaseRegex = /f(irst|ore) ?name/i;
const lnameBaseRegex = /(l(ast ?)?|sur)name/i;
const emailBaseRegex = /e ?mail( ?address)?/i;
const phoneBaseRegex = /(mobile ?)?(tele)?phone( ?number)?/i;

/**
 * Gets a regex for a specific parent number at the start.
 *
 * @param {number | string} parentNumber the parent number
 * @param {RegExp} regex the base regex to use
 */
const getRegexForParent = (parentNumber, regex) => {
    return new RegExp(`Parent ?${parentNumber} ?${regex.source}`, 'i');
};

/**
 * Converts a base regex into a forced full-line match regex.
 *
 * @param {RegExp} regex the base regex to use
 */
const forceFullMatchForRegex = (regex) => {
    return new RegExp('^' + regex + '$', 'i');
};

const importColumns = [
    { key: 'id', value: 'Unique pupil ID', match: /(Unique pupil )?ID/i },
    { key: 'forename', value: 'First name', match: forceFullMatchForRegex(fnameBaseRegex) },
    { key: 'surname', value: 'Surname', match: forceFullMatchForRegex(lnameBaseRegex) },
    { key: 'dateOfBirth', value: 'Date of birth', match: /date ?of ?birth|dob|birth ?da(te|y)/i },
    { key: 'UPN', value: 'UPN' },
    { key: 'gender', value: 'Gender', match: /gender|sex/i },
    { key: 'isPremium', value: 'Pupil Premium indicator', match: /(Pupil Premium|PP)( indicator)?/i },
    { key: 'ncYear', value: 'National Curriculum year', match: /(NC|National Curriculum)( ?year)?/i },
    {
        key: 'isClassActive',
        value: 'Is class active',
        match: /^is\s*class\s*active$/i
    },
    { key: 'className', value: 'Class name', match: /Class( ?name)?/i },
    {
        key: 'isPupilPreRegistration',
        value: 'Is pupil pre registration',
        match: /^(is ?)?(pupil|student|child)( ?pre[- ]?registration)?$/i
    },
    { key: 'parent1Email', value: 'Parent 1 email', match: getRegexForParent(1, emailBaseRegex) },
    { key: 'parent1Phone', value: 'Parent 1 phone', match: getRegexForParent(1, phoneBaseRegex) },
    { key: 'parent1Forename', value: 'Parent 1 first name', match: getRegexForParent(1, fnameBaseRegex) },
    { key: 'parent1Surname', value: 'Parent 1 surname', match: getRegexForParent(1, lnameBaseRegex) },
    { key: 'parent2Email', value: 'Parent 2 email', match: getRegexForParent(2, emailBaseRegex) },
    { key: 'parent2Phone', value: 'Parent 2 phone', match: getRegexForParent(2, phoneBaseRegex) },
    { key: 'parent2Forename', value: 'Parent 2 first name', match: getRegexForParent(2, fnameBaseRegex) },
    { key: 'parent2Surname', value: 'Parent 2 surname', match: getRegexForParent(2, lnameBaseRegex) }
];

const CSVImportColumnMatchingModal = ({ csvColumns, close, onComplete }) => {
    let [_columnMap, _setColumnMap] = useState(
        csvColumns.reduce((cols, thisCol) => {
            const normalizedCol = thisCol.replace(/"/g, '').trim();

            return {
                ...cols,
                [normalizedCol]: importColumns.find(
                    (definedCol) =>
                        definedCol.match?.test(normalizedCol) ||
                        definedCol.key === normalizedCol.toLowerCase() ||
                        definedCol.value.toLowerCase() === normalizedCol.toLowerCase()
                )?.key
            };
        }, {})
    );

    let [loading, setLoading] = useState(false);

    const head = ['CSV column', 'Import definition'];

    return (
        <DialogWrapper
            primaryBtnHandler={async () => {
                setLoading(true);
                await onComplete(_columnMap);
            }}
            onClose={close}
            setOpen={close}
            heading={'Match CSV columns'}
            dialogFooter
            contentWidth="900px"
            open={true}
            fullWidth={true}
            primaryBtnText={'Match columns'}
            primaryBtnloading={loading}
            cancelBtn>
            <CommonTable head={head}>
                {(csvColumns || []).map((column, index) => {
                    const normalizedCol = column.replace(/"/g, '').trim();

                    return (
                        <TableRow key={index}>
                            <TableCell>
                                <Paragraph text={normalizedCol} />
                            </TableCell>
                            <TableCell>
                                <CommonSelectField
                                    label={'Match to field'}
                                    options={importColumns}
                                    value={_columnMap[normalizedCol]}
                                    onChange={(e) => _setColumnMap({ ..._columnMap, [normalizedCol]: e.target.value })}
                                    isRequired
                                />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </CommonTable>
        </DialogWrapper>
    );
};

CSVImportColumnMatchingModal.propTypes = {
    csvColumns: PropTypes.array.isRequired,
    onComplete: PropTypes.func.isRequired,
    close: PropTypes.func
};

export default CSVImportColumnMatchingModal;
