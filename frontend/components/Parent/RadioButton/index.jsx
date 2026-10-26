import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import CommonCheckBox from '../../Shared/CommonCheckBox';
import Paragraph from '../../Shared/Typography/Paragraph';

const RadioButton = ({ radioButtonList, radioValue, onChange, disabled }) => {
    return (
        <FormControl component="fieldset" className="radio-formcontrol">
            <RadioGroup name="radioGroup" value={radioValue} onChange={onChange}>
                {radioButtonList.map((item) => (
                    <span key={item.value}>
                        <FormControlLabel
                            value={item.value}
                            control={<Radio classes={{ root: 'radio-check' }} />}
                            label={<Paragraph text={item.label} />}
                            classes={{ root: 'form-radio-check' }}
                            disabled={disabled}
                        />
                        <div className="ml8">
                            {item?.checkBox?.map((item) => (
                                <CommonCheckBox key={item.label} label={item.label} />
                            ))}
                        </div>
                    </span>
                ))}
            </RadioGroup>
        </FormControl>
    );
};

RadioButton.propTypes = {
    radioButtonList: PropTypes.array.isRequired,
    radioValue: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};

export default RadioButton;
