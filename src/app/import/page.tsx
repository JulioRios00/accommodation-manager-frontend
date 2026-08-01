'use client';
import { Typography, Box, Paper, Divider } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HandymanIcon from '@mui/icons-material/Handyman';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentsIcon from '@mui/icons-material/Payments';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import XlsxUploader from '@/components/upload/XlsxUploader';

interface ImportCard {
  title: string;
  description: string;
  endpoint: string;
  accepts: string;
  icon: React.ReactNode;
}

const imports: ImportCard[] = [
  {
    title: 'Accommodation Control',
    description: 'Full Accommodation Control.xlsm — imports properties, beds, residents and bookings.',
    endpoint: '/import',
    accepts: '.xlsx,.xlsm',
    icon: <ApartmentIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
  {
    title: 'Bills & Utilities',
    description: 'Bills Properties Control.xlsx — updates electricity, gas, waste and internet details on existing properties.',
    endpoint: '/import/bills',
    accepts: '.xlsx,.xlsm',
    icon: <HomeWorkIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
  {
    title: 'Maintenance Tickets',
    description: 'Maintenance Control.xlsm — imports or updates maintenance tickets from the Orders Index sheet.',
    endpoint: '/import/maintenance',
    accepts: '.xlsx,.xlsm',
    icon: <HandymanIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
  {
    title: 'Deposit Transactions',
    description: 'Deposit Control.xlsx — imports deposit receipts and refunds.',
    endpoint: '/import/deposits',
    accepts: '.xlsx,.xlsm',
    icon: <AccountBalanceIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
  {
    title: 'Landlord Payments',
    description: 'Landlord Payments Control.xlsx — imports monthly landlord payment records. Month is read from the sheet name.',
    endpoint: '/import/landlord-payments',
    accepts: '.xlsx,.xlsm',
    icon: <ReceiptLongIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
  {
    title: 'Resident Payments',
    description: 'Resident Payments Control.xlsx — imports monthly rent payment records. Month is read from the sheet name.',
    endpoint: '/import/resident-payments',
    accepts: '.xlsx,.xlsm',
    icon: <PaymentsIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
  {
    title: 'Provision Residents to Clerk',
    description: 'Three-column sheet (Full Name, Email, Date of Birth) — creates a Clerk portal account for each resident. Password is set to DDMMYYYY + last name (e.g. 15011990Murphy). Existing accounts are skipped.',
    endpoint: '/import/residents-clerk',
    accepts: '.xlsx,.xlsm,.csv',
    icon: <PersonAddIcon sx={{ fontSize: 32, color: '#DE9151' }} />,
  },
];

export default function ImportPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Import Data</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload Excel files to bulk-import records. Existing records are updated; new ones are created. Duplicates are skipped.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {imports.map((item) => (
          <Paper key={item.endpoint} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              {item.icon}
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{item.title}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{item.description}</Typography>
            <Divider sx={{ mb: 2 }} />
            <XlsxUploader endpoint={item.endpoint} label="Drop file here or click to browse" />
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
