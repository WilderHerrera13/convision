
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const Index = () => {
  useEffect(() => {
    document.title = "Convision - Sistema de Gestión de Lentes";
  }, []);

  // Redirect to login
  return <Navigate to="/login" replace />;
};

export default Index;
