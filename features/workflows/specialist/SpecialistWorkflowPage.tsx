import React, { useEffect } from 'react';

interface SpecialistWorkflowPageProps {
  navigate: (path: string) => void;
}

export default function SpecialistWorkflowPage({ navigate }: SpecialistWorkflowPageProps) {
  useEffect(() => {
    navigate('/meeting');
  }, [navigate]);
  return null;
}
