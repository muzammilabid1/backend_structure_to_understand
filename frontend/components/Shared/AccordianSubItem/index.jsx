/* eslint-disable @next/next/no-img-element */
import { ListItem, ListItemText } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { showDate } from '../../../shared/Services/handler';
import CommonRenderImage from '../CommonRenderImage';
import Divider from '../Divider';
import Heading1 from '../Typography/Heading1';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const AccordianSubItem = ({
    heading,
    subHeading,
    firstTitle,
    firstSubTitle = [],
    secondTitle,
    secondSubTitle,
    photo,
    isChildActivity,
    activityFinishedDate,
    isSharingAllowed
}) => (
    <ListItem className="accordion-list-item">
        {!photo ? (
            <>
                <ListItemText className="list-item-text">
                    <Heading1 text={heading} customClass="heading-font" />
                    {isChildActivity ? (
                        activityFinishedDate ? (
                            isSharingAllowed !== null ? (
                                <Paragraph className="activity-progress">
                                    Activity finished: {showDate({ date: activityFinishedDate })} -{' '}
                                    <span className={isSharingAllowed ? 'permitted' : 'notPermitted'}>
                                        {isSharingAllowed ? 'Sharing permitted' : 'Sharing not permitted'}
                                    </span>
                                </Paragraph>
                            ) : (
                                <Paragraph text={`Activity finished: ${showDate({ date: activityFinishedDate })}`} />
                            )
                        ) : (
                            <Paragraph text={'Activity not completed'} />
                        )
                    ) : (
                        <Paragraph text={subHeading} />
                    )}
                </ListItemText>
                <Divider />
                <ListItem className="accordion-list-content">
                    <ListItemText className="list-item-text">
                        <Heading3 text={firstTitle} />
                        {firstSubTitle.map((item) => (
                            <Paragraph key={item} text={item} />
                        ))}
                    </ListItemText>
                    <ListItemText className="list-item-text">
                        <Heading3 text={secondTitle} />
                        <Paragraph text={secondSubTitle} />
                    </ListItemText>
                </ListItem>
            </>
        ) : (
            <>
                <ListItem className="secondary-accordion-list-item">
                    <ListItemText className="list-item-text">
                        <Heading1 text={heading} customClass="heading-font" />
                        {isChildActivity ? (
                            activityFinishedDate ? (
                                isSharingAllowed !== null ? (
                                    <Paragraph className="activity-progress">
                                        Activity finished: {showDate({ date: activityFinishedDate })} -{' '}
                                        <span className={isSharingAllowed ? 'permitted' : 'notPermitted'}>
                                            {isSharingAllowed ? 'Sharing permitted' : 'Sharing not permitted'}
                                        </span>
                                    </Paragraph>
                                ) : (
                                    <Paragraph text={`Activity finished: ${showDate({ date: activityFinishedDate })}`} />
                                )
                            ) : (
                                <Paragraph text={'Activity not completed'} />
                            )
                        ) : (
                            <Paragraph text={subHeading} />
                        )}
                    </ListItemText>
                    <Divider />
                    <ListItem className="accordion-list-content">
                        <ListItemText className="list-item-text hide-on-mobile">
                            {isChildActivity ? (
                                <CommonRenderImage src={photo} className="image-on-side" isSharingAllowed={isSharingAllowed} />
                            ) : (
                                <img src={photo} alt="side img" className="side-img" />
                            )}
                        </ListItemText>

                        <ListItemText style={{ marginLeft: '15px' }} className="list-item-text">
                            <Heading3 text={firstTitle} />
                            {firstSubTitle.map((item) => (
                                <Paragraph key={item} text={item} />
                            ))}

                            <ListItemText className="secondary-list-item-text">
                                <Heading3 text={secondTitle} />
                                <Paragraph text={secondSubTitle} />
                            </ListItemText>
                        </ListItemText>
                    </ListItem>
                </ListItem>
            </>
        )}
    </ListItem>
);

AccordianSubItem.propTypes = {
    heading: PropTypes.string,
    subHeading: PropTypes.string,
    firstTitle: PropTypes.string,
    firstSubTitle: PropTypes.array,
    secondTitle: PropTypes.string,
    secondSubTitle: PropTypes.string,
    photo: PropTypes.string,
    activityFinishedDate: PropTypes.string,
    isChildActivity: PropTypes.boolean,
    isSharingAllowed: PropTypes.boolean
};

export default AccordianSubItem;
