import Reactt, { useEffect } from 'react';
import Modal from '@mui/material/Modal';

const BasicModal = ({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; }) => {
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
                    {children}
                </div>
            </div>
        </Modal>
    )
}

export default BasicModal;