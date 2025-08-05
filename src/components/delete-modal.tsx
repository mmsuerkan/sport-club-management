import React, { useEffect } from 'react';
import Modal from '@mui/material/Modal';
import { Button } from '@mui/material';

interface DeleteModalProps {
  open: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const DeleteModal = ({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = 'Sil',
  cancelLabel = 'İptal',
  danger = true,
}: DeleteModalProps) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onCancel}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl p-6 w-3xl shadow-2xl border border-gray-200 transform transition-all">
        <div className="text-center">
          {title}
          <p className="text-sm text-gray-500 mb-6">{description}</p>
          <div className="flex gap-3">
            <Button
            type="button"
              onClick={onCancel}
              variant='outlined'
              className="!flex-1 !px-4 !py-2 !border-gray-300 !text-gray-700 !rounded-lg hover:!bg-gray-50 !transition-colors"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              onClick={onConfirm}
              className={`!flex-1 !px-4 !py-2 !text-white !rounded-lg !transition-colors ${
                danger
                  ? '!bg-red-600 hover:!bg-red-700'
                  : '!bg-blue-600 hover:!bg-blue-700'
              }`}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </Modal>
  );
};

export default DeleteModal;