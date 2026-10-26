import { Paper } from '@mui/material';
import React, { Fragment, isValidElement, ReactNode } from 'react';

import Divider from '../Divider';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

export interface SummaryCardItem {
    label: string;
    /**
     * Plain strings and numbers are rendered through Paragraph. Anything that is
     * already an element (a badge, a tooltip, a link) is rendered untouched, so
     * callers keep full control of their own values.
     */
    value: ReactNode;
    dataTest?: string;
    valueClass?: string;
    isTruncate?: boolean;
}

export interface SummaryCardRow {
    /** Each column is a vertical stack of one or more label/value pairs. */
    columns: SummaryCardItem[][];
    /** Content pinned to the end of the row, such as an image. */
    aside?: ReactNode;
}

interface SummaryCardProps {
    rows: SummaryCardRow[];
    /** Draw a divider between rows. */
    dividers?: boolean;
    /** Render without the Paper wrapper, for callers that supply their own card. */
    bare?: boolean;
    /** Replaces the default row class, letting a caller keep its existing spacing. */
    rowClass?: string;
    /** Class for the spacer between stacked pairs within a column. */
    stackSpacingClass?: string;
    className?: string;
    dataTest?: string;
}

const renderValue = ({ value, dataTest, valueClass, isTruncate }: SummaryCardItem) => {
    if (isValidElement(value)) return value;

    return <Paragraph text={value as string} dataTest={dataTest} customClass={valueClass} isTruncate={isTruncate} />;
};

const SummaryCard = ({
    rows,
    dividers = false,
    bare = false,
    rowClass = 'summary-card-row',
    stackSpacingClass = 'summary-card-stack-spacing',
    className = '',
    dataTest
}: SummaryCardProps) => {
    const content = rows.map((row, rowIndex) => (
        <Fragment key={rowIndex}>
            {dividers && rowIndex > 0 ? <Divider /> : null}
            <div className={rowClass}>
                {row.columns.map((column, columnIndex) => (
                    <span key={columnIndex}>
                        {column.map((item, itemIndex) => (
                            <Fragment key={itemIndex}>
                                {itemIndex > 0 ? <div className={stackSpacingClass} /> : null}
                                <Heading3 text={item.label} />
                                {renderValue(item)}
                            </Fragment>
                        ))}
                    </span>
                ))}
                {row.aside}
            </div>
        </Fragment>
    ));

    if (bare) return <>{content}</>;

    return (
        <div className={`summary-card ${className}`.trim()} data-test={dataTest}>
            <Paper>{content}</Paper>
        </div>
    );
};

export default SummaryCard;
