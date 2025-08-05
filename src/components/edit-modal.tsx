import React, { useEffect } from 'react';
import Modal from '@mui/material/Modal';
import { Button } from '@mui/material';

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  onEdit?: () => void;
  editing?: boolean;
  editLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
}

const EditModal = ({
  open,
  onClose,
  onSubmit,
  onEdit,
  editing = false,
  editLabel,
  cancelLabel,
  children,
  className
}: EditModalProps) => {
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
    <Modal open={open} onClose={onClose}>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-2xl p-6 w-full shadow-2xl border border-gray-200 transform transition-all ${className}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit;
            }}
          >
            {children}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outlined"
                className="flex-1 !px-4 !py-2 !border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 !text-base"
              >
                {cancelLabel || 'İptal'}
              </Button>
              <Button
                type="submit"
                onClick={onEdit}
                className="flex-1 !px-4 !py-2 !text-white rounded-md bg-gradient-to-r from-blue-500 to-purple-600 !text-base"
              >
                {editLabel || (editing ? 'Güncelle' : 'Ekle')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default EditModal;