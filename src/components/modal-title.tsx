import React from 'react';
import { XCircle } from 'lucide-react';
import Button from '@mui/material/Button';

const ModalTitle = ({modalTitle, setShowModal}: {modalTitle: string; setShowModal: (show: boolean) => void;}) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">{modalTitle}</h2>

      <Button
        onClick={() => setShowModal(false)}
        className="text-gray-500 hover:text-gray-700"
      >
        <XCircle size={24} />
      </Button>
    </div>
  );
};

export default ModalTitle;
