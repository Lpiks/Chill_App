import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { colors } from '../constants/colors';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/api';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Flag, 
  DollarSign, 
  Flame, 
  Tv, 
  Bell, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminService.getStats().then(res => res.data),
    refetchInterval: 30000
  });

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/' },
    { name: 'Utilisateurs', icon: <Users size={22} />, path: '/users' },
    { name: 'Publications', icon: <MessageSquare size={22} />, path: '/posts' },
    { name: 'Signalements', icon: <Flag size={22} />, path: '/reports', badge: stats?.pendingReports },
    { name: 'Revenus', icon: <DollarSign size={22} />, path: '/revenue' },
    { name: 'Tendances', icon: <Flame size={22} />, path: '/trending' },
    { name: 'Streams', icon: <Tv size={22} />, path: '/streams' },
    { name: 'Notifications', icon: <Bell size={22} />, path: '/notifications' },
    { name: 'Paramètres', icon: <Settings size={22} />, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isHovered ? '240px' : '80px',
        height: 'calc(100vh - 40px)',
        backgroundColor: 'rgba(17, 17, 24, 0.8)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${colors.border}`,
        borderRadius: '20px',
        margin: '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}
    >
      {/* Logo Section */}
      <div 
        onClick={() => navigate('/')}
        style={{ 
          padding: '30px 0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderBottom: `1px solid ${colors.border}`,
          cursor: 'pointer'
        }}
      >
        {isHovered ? (
          <h1 style={{ color: colors.red, fontSize: '20px', margin: 0, fontWeight: '900', letterSpacing: '1px' }}>CINEDZ</h1>
        ) : (
          <div style={{ width: '30px', height: '30px', backgroundColor: colors.red, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px' }}>C</div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="sidebar-nav" style={{ 
        flex: 1, 
        padding: '20px 10px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <style>
          {`
            .sidebar-nav::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={!isHovered ? item.name : ''}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: isHovered ? 'flex-start' : 'center',
              padding: '12px',
              color: isActive ? 'white' : colors.muted,
              textDecoration: 'none',
              borderRadius: '12px',
              backgroundColor: isActive ? colors.red : 'transparent',
              transition: 'all 0.3s',
              position: 'relative',
              whiteSpace: 'nowrap',
              minHeight: '46px'
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </div>
            {isHovered && (
              <span style={{ marginLeft: '15px', fontWeight: 600, fontSize: '14px' }}>{item.name}</span>
            )}
            
            {/* Badge */}
            {item.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: '5px',
                right: isHovered ? '15px' : '5px',
                backgroundColor: isActive ? 'white' : colors.red,
                color: isActive ? colors.red : 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer / User Profile */}
      <div style={{ 
        padding: '20px 10px', 
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: 'rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isHovered ? 'flex-start' : 'center',
          marginBottom: '15px',
          padding: '0 10px'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '10px', 
            backgroundColor: colors.bg3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${colors.border}`,
            flexShrink: 0
          }}>
            {admin?.name?.charAt(0) || 'A'}
          </div>
          {isHovered && (
            <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{admin?.name || 'Admin'}</div>
              <div style={{ fontSize: '10px', color: colors.muted }}>Manager</div>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isHovered ? 'flex-start' : 'center',
            width: '100%',
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            color: colors.muted,
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(229, 9, 20, 0.1)';
            e.currentTarget.style.color = colors.red;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.muted;
          }}
        >
          <LogOut size={20} />
          {isHovered && <span style={{ marginLeft: '15px', fontWeight: 600, fontSize: '14px' }}>Déconnexion</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
