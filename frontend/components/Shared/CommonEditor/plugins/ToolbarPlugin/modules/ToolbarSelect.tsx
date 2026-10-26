export default function ToolbarSelect<OptionValue extends string | number>({ options, value, onChange }: Props<OptionValue>) {
    return (
        <select
            className={'toolbar-item'}
            value={value?.value}
            onChange={(event) => onChange(options.find((option) => option.value === event.target.value))}>
            {options.map((option, index) => (
                <option key={index} label={option.label} value={option.value} />
            ))}
        </select>
    );
}

interface Props<OptionValue> {
    options: Option<OptionValue>[];
    value?: Option<OptionValue> | null;
    onChange: (option: Option<OptionValue>) => void;
}

interface Option<OptionValue> {
    label: string;
    value: OptionValue;
}
