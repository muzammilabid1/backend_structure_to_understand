/* eslint-disable */
import React from 'react';
import { capitalizeFirstLetter } from '../../../shared/Services/handler';

interface SubjectType {
    name?: string;
}

interface CommonTagsProps {
    className?: string;
    type?: SubjectType[];
    isReadingClass?: boolean;
}

const SubjectTags = ({ className = '', type = [], isReadingClass = false }: CommonTagsProps) => {
    const convertSubjects = () => {
        if (!type) return [];

        const subjects = [];

        if (type?.length > 1) {
            subjects.push('Topics');
        } else if (type?.length) {
            subjects.push(type?.[0]?.name);
        }

        if (isReadingClass) {
            subjects.push('Reading');
        }

        return subjects;
    };

    const getColor = (value) => {
        const subject = capitalizeFirstLetter(value);

        if (subject == 'Reading') {
            return '#887DFF';
        } else {
            return '#65B32E';
        }
    };

    return (
        <div className="common_Tags_container">
            {convertSubjects()?.map((arr) => (
                <div className={`common_Tags ${className}`} style={{ backgroundColor: getColor(arr.name ?? arr) }}>
                    <p>{capitalizeFirstLetter(arr.name ?? arr)}</p>
                </div>
            ))}
        </div>
    );
};

export default SubjectTags;
