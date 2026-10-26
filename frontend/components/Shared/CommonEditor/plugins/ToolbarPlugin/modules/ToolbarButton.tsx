import React, { ButtonHTMLAttributes, DetailedHTMLProps, MouseEventHandler } from 'react';

export default function ToolbarButton({ active, children, className = '', ...rest }: Props) {
    return (
        <button className={`toolbar-item ${active ? 'active' : ''} ${className}`} type={'button'} {...rest}>
            {children}
        </button>
    );
}

interface Props extends DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
    active?: boolean;
    disabled?: boolean;
    onClick: MouseEventHandler<HTMLButtonElement>;
    children: React.ReactNode;
}
