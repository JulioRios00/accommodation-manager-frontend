'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#DE9151',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FFF9F3',
      paper: '#ffffff',
    },
    text: {
      primary: '#424242',
      secondary: '#6d6d6d',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          '&:hover': { backgroundColor: '#c97d3e' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorSuccess: { backgroundColor: '#4caf50' },
        colorWarning: { backgroundColor: '#ff9800' },
      },
    },
  },
});

export default theme;
