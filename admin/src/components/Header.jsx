import React from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../constants/colors';
import { Bell, Search } from 'lucide-react';

const Header = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '80px',
      backgroundColor: 'rgba(10, 10, 15, 0.7)',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>{title}</h2>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginRight: '20px' }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '15px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: colors.muted 
          }} />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            style={{
              backgroundColor: colors.bg2,
              border: `1px solid ${colors.border}`,
              borderRadius: '25px',
              padding: '10px 20px 10px 45px',
              color: colors.text,
              width: '300px',
              outline: 'none',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => {
              e.target.style.width = '400px';
              e.target.style.borderColor = colors.red;
            }}
            onBlur={(e) => {
              e.target.style.width = '300px';
              e.target.style.borderColor = colors.border;
            }}
          />
        </div>
        
        <div 
          onClick={() => navigate('/notifications')}
          style={{ 
            position: 'relative',
            cursor: 'pointer',
            padding: '10px',
            borderRadius: '12px',
            backgroundColor: colors.bg2,
            border: `1px solid ${colors.border}`,
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg3}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg2}
        >
          <Bell size={22} />
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '10px',
            height: '10px',
            backgroundColor: colors.red,
            borderRadius: '50%',
            border: `2px solid ${colors.bg2}`,
            boxShadow: `0 0 10px ${colors.red}`
          }} />
        </div>
      </div>
    </div>
  );
};

export default Header;
