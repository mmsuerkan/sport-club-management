import React from 'react';

const ModalTitle = ({modalTitle, onClose}: {modalTitle: string; onClose: () => void}) => {
  return (
    <div className="flex px-[30px] pb-[30px] border-b border-[#bbb] mb-[18px] -mx-[24px]">
      <h2 className="text-xl font-bold">{modalTitle}</h2>
    </div>
  );
};

export default ModalTitle;