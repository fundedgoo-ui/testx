import React from 'react';

interface ToolSettingsPopupProps {
  color: string;
  thickness: number;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onClose: () => void;
  position: { x: number, y: number };
}

export const ToolSettingsPopup: React.FC<ToolSettingsPopupProps> = ({ 
  color, thickness, onColorChange, onThicknessChange, onClose, position 
}) => {
  return (
    <div 
      className="absolute z-[1000] bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-2xl text-white w-48"
      style={{ left: position.x, top: position.y }}
    >
      <h3 className="text-sm font-semibold mb-3">Tool Settings</h3>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Color</span>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Thickness ({thickness}px)</span>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={thickness} 
            onChange={(e) => onThicknessChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </label>
        <button 
          onClick={onClose}
          className="w-full mt-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1.5 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
