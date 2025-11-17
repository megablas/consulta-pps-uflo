import React from 'react';
import CorreccionPanel from '../../components/CorreccionPanel';

interface CorreccionViewProps {
  isTestingMode?: boolean;
}

const CorreccionView: React.FC<CorreccionViewProps> = ({ isTestingMode = false }) => {
  return <CorreccionPanel isTestingMode={isTestingMode} />;
};

export default CorreccionView;