import React from 'react';

const ModalTitle = ({modalTitle}: {modalTitle: string;}) => {
  return (
    <div className="flex px-[24px] pb-[24px] border-b border-b-gray-200 mb-[18px] -mx-[24px]">
      <h2 className="text-xl font-bold">{modalTitle}</h2>
    </div>
  );
};

export default ModalTitle;