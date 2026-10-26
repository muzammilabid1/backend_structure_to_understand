import { Box } from '@mui/material';

interface ColorCircleProps {
    isActive: boolean;
    onChange: () => void;
    color: string;
    dataTest?: string;
}
const ColorCircle = ({ isActive, onChange, color, dataTest }: ColorCircleProps) => {
    return (
        <Box
            component="span"
            data-test={dataTest}
            onClick={onChange}
            sx={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: isActive ? '2px solid black' : color === '#ffffff' ? '2px solid #D6D1CB' : '',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
            }}>
            <Box
                component="span"
                sx={{
                    width: isActive ? '70%' : '100%',
                    height: isActive ? '70%' : '100%',
                    borderRadius: '50%',
                    backgroundColor: color
                }}
            />
        </Box>
    );
};

export default ColorCircle;
