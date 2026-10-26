/* eslint-disable @next/next/no-img-element */
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

const CommonList = ({ list, img, className }) => (
    <div className={`common_list ${className}`}>
        {list.map((item) => (
            <List key={item.text}>
                <ListItem>
                    <ListItemIcon>
                        {img ? (
                            <img src={item.icon} className="svg-icon" alt="status icon" />
                        ) : item?.img ? (
                            <img src={item.img} className="svg-icon" alt="status icon" />
                        ) : (
                            <span className={`material-icons ${item.icon}-icon`}>{item.icon}</span>
                        )}
                    </ListItemIcon>
                    <ListItemText>{item.text}</ListItemText>
                </ListItem>
            </List>
        ))}
    </div>
);

CommonList.propTypes = { img: PropTypes.string, list: PropTypes.array, className: PropTypes.string };

export default CommonList;
