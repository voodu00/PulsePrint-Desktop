import React from 'react';
import { Grid3X3, List } from 'lucide-react';
import { Button } from './ui/button';

interface ViewToggleProps {
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
      <Button
        variant={viewMode === 'card' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('card')}
        className="view-toggle-button h-8 px-3"
        title="Card View"
      >
        <Grid3X3 className="w-4 h-4" />
        <span className="ml-1 hidden sm:inline">Cards</span>
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('table')}
        className="view-toggle-button h-8 px-3"
        title="Table View"
      >
        <List className="w-4 h-4" />
        <span className="ml-1 hidden sm:inline">Table</span>
      </Button>
    </div>
  );
};

export default ViewToggle;
