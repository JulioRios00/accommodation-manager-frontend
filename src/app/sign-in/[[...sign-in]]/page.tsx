import { SignIn } from '@clerk/nextjs';
import { Box } from '@mui/material';

export default function SignInPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#FFF9F3',
      }}
    >
      <SignIn />
    </Box>
  );
}
