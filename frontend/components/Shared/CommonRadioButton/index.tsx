import { FormHelperText, InputLabel } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import React, { ChangeEvent } from 'react';

import CommonError from '../CommonError';
import CommonTooltipIcon from '../CommonTooltipIcon';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

interface OptionType {
    text: string;
    heading?: string;
    dataTest?: string;
    value: string;
    // When set, an info icon is shown next to the option; hovering it reveals this text.
    tooltip?: string;
}

interface CommonRadioButtonProps {
    name: string;
    shrink?: boolean;
    value: string;
    error?: string;
    touched?: boolean;
    helperText?: string;
    disabled?: boolean;
    onChange: (event: { target: { name: string; value: string } }) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    options?: OptionType[];
    label?: string;
    // When false, the option cards render without the border / selected-background styling (plain radio list).
    bordered?: boolean;
}

const CommonRadioButton = ({
    name,
    shrink,
    value,
    error,
    touched,
    helperText,
    onChange,
    onBlur,
    options = [],
    label,
    bordered = true
}: CommonRadioButtonProps) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange({
            target: { name: name, value: event.target.value }
        });
    };

    return (
        <FormControl component="fieldset" className="common_radio_button">
            <InputLabel shrink={shrink} htmlFor="component-outlined">
                {label}
            </InputLabel>
            <RadioGroup name={name} value={value} onChange={handleChange} onBlur={onBlur} className="common_radio_container">
                {options?.map((item) => (
                    <span
                        key={item?.value}
                        className={
                            bordered
                                ? `common_radio_border ${item?.value == value ? 'border_active' : 'border_unActive'}`
                                : 'common_radio_border common_radio_borderless'
                        }>
                        <FormControlLabel
                            value={item?.value}
                            control={<Radio classes={{ root: 'radio-check' }} />}
                            classes={{ root: 'form-radio-check' }}
                            label={
                                <div>
                                    {item?.heading && <Heading3 text={item?.heading} />}
                                    <span className="common_radio_text">
                                        <Paragraph dataTest={item?.dataTest} text={item?.text} />
                                        {item?.tooltip && (
                                            <CommonTooltipIcon
                                                text={item.tooltip}
                                                dataTest={item?.dataTest ? `${item.dataTest}-tooltip` : undefined}
                                            />
                                        )}
                                    </span>
                                </div>
                            }
                        />
                    </span>
                ))}
            </RadioGroup>

            <FormHelperText>{helperText}</FormHelperText>
            <CommonError error={error} touched={touched} />
        </FormControl>
    );
};

export default CommonRadioButton;
