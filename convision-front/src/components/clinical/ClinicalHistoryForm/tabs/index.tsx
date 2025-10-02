import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';

// Import tab components
import ClinicalHistoryTab from './ClinicalHistoryTab';
import RxFinalTab from './RxFinalTab';
import ContactologiaTab from './ContactologiaTab';
import EvolucionesTab from './EvolucionesTab';
import DocumentosTab from './DocumentosTab';
import RemisionTab from './RemisionTab/RemisionTab';
import ProtesisTab from './ProtesisTab';

// Import context provider and auto-save indicator
import { ClinicalHistoryProvider } from '../context/ClinicalHistoryContext';
import AutoSaveIndicator from '../components/AutoSaveIndicator';

// Define the ClinicalHistoryFormProps interface here since we need it for the tabs
interface ClinicalHistoryFormProps {
  patient: {
    id: number;
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
  initialData: Record<string, unknown> | null;
  onCancel: () => void;
  onSave: (history: Record<string, unknown>) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`clinical-history-tabpanel-${index}`}
      aria-labelledby={`clinical-history-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
};


const a11yProps = (index: number) => {
  return {
    id: `clinical-history-tab-${index}`,
    'aria-controls': `clinical-history-tabpanel-${index}`,
  };
};

const ClinicalHistoryTabs: React.FC<ClinicalHistoryFormProps> = (props) => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tabs = [
    { 
      label: 'Historia Clínica', 
      component: <ClinicalHistoryTab {...props} /> 
    },
    { 
      label: 'Rx Final', 
      component: <RxFinalTab />
    },
    { 
      label: 'Contactología', 
      component: <ContactologiaTab />
    },
    { 
      label: 'Evoluciones', 
      component: <EvolucionesTab />
    },
    { 
      label: 'Documentos', 
      component: <DocumentosTab />
    },
    { 
      label: 'Remisión', 
      component: <RemisionTab />
    },
    { 
      label: 'Prótesis', 
      component: <ProtesisTab />
    },
  ];

  return (
    <ClinicalHistoryProvider patient={props.patient} initialData={props.initialData}>
      <Box sx={{ width: '100%' }}>
        {/* Sticky Tab Header */}
        <Box 
          sx={{ 
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            borderBottom: 1, 
            borderColor: 'divider',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
            <Tabs 
              value={value} 
              onChange={handleChange} 
              aria-label="clinical history tabs"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flex: 1,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minWidth: 120,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '&.Mui-selected': {
                    color: '#1976d2',
                    fontWeight: 600,
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1976d2',
                  height: 3,
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab 
                  key={index}
                  label={tab.label} 
                  {...a11yProps(index)} 
                />
              ))}
            </Tabs>
            <AutoSaveIndicator />
          </Box>
        </Box>
        
        {/* Tab Content */}
        <Box>
          {tabs.map((tab, index) => (
            <TabPanel key={index} value={value} index={index}>
              {tab.component}
            </TabPanel>
          ))}
        </Box>
      </Box>
    </ClinicalHistoryProvider>
  );
};

export default ClinicalHistoryTabs;
