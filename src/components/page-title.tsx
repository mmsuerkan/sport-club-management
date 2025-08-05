import React from 'react';
import { BarChart2, Plus, Calendar } from 'lucide-react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

const PageTitle = ({ viewMode, setViewMode, setEditingUser, buttonIcon, pageIcon, setShowModal, pageTitle, pageDescription, firstButtonText, secondButtonText }: { viewMode?: 'list' | 'analytics'; setViewMode?: (mode: 'list' | 'analytics') => void; setEditingUser?: (user: any) => void; setShowModal?: (show: boolean) => void; pageTitle: string; pageDescription: string; firstButtonText?: string; pageIcon?: React.ReactNode; buttonIcon?: React.ReactNode; secondButtonText?: string }) => {
    const iconWithClass = React.isValidElement(pageIcon)
        ? React.cloneElement(pageIcon as React.ReactElement<any>, {
            className: 'h-6 w-6 text-white ' + ((pageIcon.props as any).className ?? ''),
        })
        : null;
    const getFirstBtnClass = () => {
        if (!secondButtonText || viewMode === 'list') {
            return '!bg-gradient-to-r !from-blue-500 !to-purple-600 !text-white';
        }
        return '!bg-gray-100 !text-gray-700 hover:!bg-gray-200';
    };

    const getSecondBtnClass = () => {
        if (!secondButtonText) return '';
        return viewMode === 'analytics'
            ? '!bg-gradient-to-r !from-blue-500 !to-purple-600 !text-white'
            : '!bg-gray-100 !text-gray-700 hover:!bg-gray-200';
    };
    return (
        <div className="flex justify-between items-center mb-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            {iconWithClass}
                        </div>
                        {pageTitle}
                    </h1>
                    <p className="text-gray-600 mt-2">{pageDescription}</p>
                </div>

                {firstButtonText ? <div className="flex gap-2 first-button-text icon-buttons">
                    <Button
                        onClick={() => {
                            if (viewMode === 'analytics') setViewMode?.('list');
                            if (setEditingUser) setEditingUser(null);
                            if (setShowModal) setShowModal(true);
                        }}
                        className={`px-6 py-3 !rounded-lg font-medium flex items-center gap-2 min-h-10 !transition-all !duration-300 transform hover:shadow-lg hover:shadow-blue-500/25 hover:!scale-105 !shadow-none !border-none !box-shadow ${getFirstBtnClass()}`}
                        variant="contained"
                        color="primary"
                    >
                        {buttonIcon ? buttonIcon : <AddIcon />}
                        {firstButtonText}
                    </Button>
                    {secondButtonText && (
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => setViewMode?.('analytics')}
                            className={`!transition-all !duration-300 hover:!scale-105 !shadow-none !border-none !box-shadow !rounded-lg flex items-center gap-2 min-h-10 px-4 py-2 font-medium ${getSecondBtnClass()}`}
                        >
                            <BarChart2 className="h-4 w-4 inline mr-2" />
                            {secondButtonText}
                        </Button>
                    )}
                </div> : ""}
            </div>
        </div>
    )
}

export default PageTitle