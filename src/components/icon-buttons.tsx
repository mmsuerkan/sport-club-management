import React from 'react';
import { Tooltip } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

interface BaseItem {
  id: string | number;
  isActive?: boolean;
  groupIds?: any;
  [key: string]: any;
}

interface IconButtonsProps<T extends BaseItem> {
  item: T;
  onEdit?: (item: T) => void;
  onToggleActive?: (id: string | number, isActive: boolean) => void;
  onGroupAssignment?: (id: string | number, isActive: boolean) => void;
  onDelete?: (id: string | number) => void;
  onViewDetails?: (id: string | number) => void;
  onShowStats?: (item: T) => void;
}

const IconButtons = <T extends BaseItem>({
  item,
  onEdit,
  onToggleActive,
  onGroupAssignment,
  onDelete,
  onViewDetails,
  onShowStats
}: IconButtonsProps<T>) => {
  return (
    <div className={`${onShowStats ? 'justify-start' : 'justify-center'} flex items-center gap-1 icon-buttons`}>
      {onShowStats && (
        <Tooltip title="İstatistikleri Gör" placement="top">
          <IconButton
            onClick={() => onShowStats(item)}
            className="!text-purple-400 hover:!text-purple-700 p-1"
          >
            <BarChartIcon />
          </IconButton>
        </Tooltip>
      )}

      {onViewDetails && (
        <Tooltip title="Düzenle" placement="top">
          <IconButton
            onClick={() => onViewDetails(item.id)}
            className="!text-green-400 hover:!text-green-700 p-1"
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
      )}

      {onEdit && (
        <Tooltip title="Güncelle" placement="top">
          <IconButton
            onClick={() => onEdit(item)}
            className="!text-blue-400 hover:!text-blue-700 p-1"
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}

      {onToggleActive && typeof item.isActive === 'boolean' && (
        <Tooltip title={item.isActive ? 'Pasif Yap' : 'Aktif Yap'} placement="top">
          <IconButton
            onClick={() => onToggleActive(item.id, item.isActive!)}
            className={
              item.isActive
                ? 'p-1 !text-green-400 hover:!text-green-700'
                : 'p-1 !text-slate-400 hover:!text-slate-700'
            }
          >
            {item.isActive ? <PersonIcon /> : <PersonOffIcon />}
          </IconButton>
        </Tooltip>
      )}

      {onGroupAssignment && (
        <Tooltip title={item.groupIds && item.groupIds.length > 0 ? 'Grupları Göster' : 'Gruplara Ata'} placement="top">
          <IconButton
            onClick={() => onGroupAssignment(item.id, item.isActive!)}
            className={
                item.groupIds && item.groupIds.length > 0
                ? 'p-1 !text-green-400 hover:!text-green-700'
                : 'p-1 !text-slate-400 hover:!text-slate-700'
            }
          >
            <PeopleAltIcon />
          </IconButton>
        </Tooltip>
      )}

      {onDelete && (
        <Tooltip title="Sil" placement="top">
          <IconButton
            onClick={() => onDelete(item.id)}
            className="p-1 !text-red-400 hover:!text-red-700"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
};

export default IconButtons;