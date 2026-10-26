import PropTypes from 'prop-types';
import React from 'react';

const CommonSideBarMini = ({ data, active }) => {
    const getFirstLetters = (words) => {
        const originalArray = words.split(' ');
        const splitWords = originalArray.filter((x) => x);

        if (splitWords.length >= 2) {
            return `${splitWords[0][0]}${splitWords[1][0]}`;
        } else {
            const name = `${splitWords[0][0]}${splitWords[0][1]}`;

            return name.toUpperCase();
        }
    };

    const name = getFirstLetters(data?.name);

    return (
        <div className="class_and_groups_mini" role="navigation" aria-label="Sidebar Mini">
            <div className={`mini_sidebar_container ${active ? 'active' : ''}`} aria-selected={active}>
                <div className={`mini_sidebar_gol ${active ? 'active' : ''}`} aria-hidden="true">
                    {name}
                </div>
            </div>
        </div>
    );
};

CommonSideBarMini.propTypes = {
    data: PropTypes.object.isRequired,
    active: PropTypes.bool
};

export default CommonSideBarMini;
