import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    breakpoints: {
        values: {
            xs: 0,
            sm: 768,
            md: 769,
            lg: 1160,
            xl: 1440
        }
    },
    typography: {
        fontFamily: 'Verdana'
    },
    palette: {
        primary: {
            main: '#f28d00'
        },
        text: {
            primary: '#000000',
            secondary: '#ffffff'
        }
    }
});

export default theme;
