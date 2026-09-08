import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { colors } from '../constants/colors';

const CustomDropdown = ({ value, onChange, options, placeholder, width = '200px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: colors.bg2,
          border: `1px solid ${isOpen ? colors.red : colors.border}`,
          borderRadius: '10px',
          padding: '10px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          color: value ? colors.text : colors.muted,
          fontSize: '14px',
          transition: 'all 0.3s'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            transition: 'transform 0.3s', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            color: colors.muted 
          }} 
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          backgroundColor: '#111118',
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
          padding: '5px'
        }}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                borderRadius: '8px',
                fontSize: '14px',
                color: value === option.value ? colors.red : colors.text,
                backgroundColor: value === option.value ? 'rgba(229,9,20,0.1)' : 'transparent',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
