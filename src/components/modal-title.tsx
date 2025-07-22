import React from 'react';
import { XCircle } from 'lucide-react';
import Button from '@mui/material/Button';

const ModalTitle = ({modalTitle, onClose}: {modalTitle: string; onClose: () => void}) => {
  return (
    <div className="flex justify-between items-center px-[30px] pb-[30px] border-b border-[#bbb] mb-[18px] -mx-[32px]">
      <h2 className="text-xl font-bold">{modalTitle}</h2>
      <Button
        onClick={() => onClose()}
        className="text-gray-500 hover:text-gray-700"
      >
        <XCircle size={24} />
      </Button>
    </div>
  );
};

export default ModalTitle;
