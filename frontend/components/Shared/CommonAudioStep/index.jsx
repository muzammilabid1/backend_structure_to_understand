import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import AudioPlayer from './../AudioPlayer';

const muiTheme = createTheme({});

const CommonAudioStep = ({ audioUrl }) => {
    return (
        <div className="activity-step-audio">
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={muiTheme}>
                    <AudioPlayer src={audioUrl} />
                </ThemeProvider>
            </StyledEngineProvider>
        </div>
    );
};

CommonAudioStep.propTypes = { audioUrl: PropTypes.string.isRequired };

export default CommonAudioStep;
