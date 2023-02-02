import { forwardRef } from 'react';
import './Toolbar.scss';

const Toolbar = forwardRef(({ tool, onToolChange }, ref) => {
  return (
    <div className="Toolbar" ref={ref}>
      <button className={tool === 'draw' ? 'selected' : undefined} onClick={() => onToolChange('draw')}>Draw</button>
      <button className={tool === 'select' ? 'selected' : undefined} onClick={() => onToolChange('select')}>Select</button>
    </div>
  );
});

export default Toolbar;