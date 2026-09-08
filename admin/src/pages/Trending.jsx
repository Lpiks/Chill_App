import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { Pin, Trash2, RefreshCw, Star, Play, Share2, TrendingUp, Trophy, Flame, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Trending = () => {
  const [category, setCategory] = useState('movie');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminTrending', category],
    queryFn: () => adminService.getTrending(category).then(res => res.data)
  });

  const pinMutation = useMutation({
    mutationFn: (tmdbId) => adminService.pinTrending(tmdbId),
    onSuccess: () => {
      toast.success("Contenu épinglé en tête de liste");
      queryClient.invalidateQueries(['adminTrending']);
    }
  });

  const recalculateMutation = useMutation({
    mutationFn: () => adminService.recalculateTrending(),
    onSuccess: () => {
      toast.success("Algorithme de tendance mis à jour");
      queryClient.invalidateQueries(['adminTrending']);
    }
  });

  const categories = [
    { id: 'movie', label: 'Films', icon: <TrendingUp size={16} /> },
    { id: 'tv', label: 'Séries', icon: <Zap size={16} /> },
    { id: 'kdrama', label: 'K-Drama', icon: <Flame size={16} /> },
    { id: 'anime', label: 'Anime', icon: <Zap size={16} /> }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Contrôle des Tendances" />
      
      <div style={{ padding: '40px' }}>
        {/* Top bar with filters and global actions */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '35px',
          backgroundColor: colors.bg2,
          padding: '15px 25px',
          borderRadius: '24px',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          {/* Modern Category Selector */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 22px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: category === cat.id ? colors.red : colors.bg3,
                  color: category === cat.id ? 'white' : colors.muted,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  boxShadow: category === cat.id ? '0 5px 15px rgba(229, 9, 20, 0.3)' : 'none',
                  border: `1px solid ${category === cat.id ? colors.red : colors.border}`
                }}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isLoading}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 25px', 
              backgroundColor: 'transparent', color: colors.gold, border: `1px solid ${colors.gold}40`, 
              borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.gold}10`;
              e.currentTarget.style.borderColor = colors.gold;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = `${colors.gold}40`;
            }}
          >
            <RefreshCw size={18} className={recalculateMutation.isLoading ? 'animate-spin' : ''} />
            Mettre à jour l'algorithme
          </button>
        </div>

        {/* Trending Table */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          border: `1px solid ${colors.border}`, 
          borderRadius: '28px', 
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: colors.bg3, color: colors.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              <tr>
                <th style={{ padding: '20px 30px', width: '100px', textAlign: 'center' }}>Position</th>
                <th style={{ padding: '20px 30px' }}>Contenu Média</th>
                <th style={{ padding: '20px 30px' }}>Score de Virilité</th>
                <th style={{ padding: '20px 30px' }}>Engagement Global</th>
                <th style={{ padding: '20px 30px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}><RefreshCw className="animate-spin" color={colors.red} size={30} /></td></tr>
              ) : data?.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center', color: colors.muted }}>Aucune donnée de tendance disponible pour cette catégorie.</td></tr>
              ) : data?.map((item, index) => (
                <tr 
                  key={item._id} 
                  style={{ 
                    borderTop: `1px solid ${colors.border}`, 
                    transition: 'all 0.2s',
                    backgroundColor: index < 3 ? 'rgba(255,215,0,0.02)' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index < 3 ? 'rgba(255,215,0,0.02)' : 'transparent'}
                >
                  <td style={{ padding: '20px 30px', textAlign: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '12px', margin: '0 auto',
                      backgroundColor: index === 0 ? colors.gold : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : colors.bg3)),
                      color: index < 3 ? colors.bg : colors.muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: '900',
                      boxShadow: index < 3 ? `0 0 15px ${index === 0 ? colors.gold : '#C0C0C0'}40` : 'none'
                    }}>
                      {index === 0 ? <Trophy size={18} /> : index + 1}
                    </div>
                  </td>
                  <td style={{ padding: '20px 30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={`https://image.tmdb.org/t/p/w154${item.posterPath}`} 
                          style={{ width: '50px', height: '75px', borderRadius: '10px', objectFit: 'cover', border: `1px solid ${colors.border}`, boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }} 
                        />
                        {index === 0 && (
                          <div style={{ position: 'absolute', top: '-5px', left: '-5px', backgroundColor: colors.red, padding: '4px', borderRadius: '8px', boxShadow: '0 0 10px red' }}>
                            <Flame size={12} color="white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'white' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>TMDB Reference: {item.tmdbId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ height: '8px', flex: 1, backgroundColor: colors.bg3, borderRadius: '4px', maxWidth: '100px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, item.score / 5)}%`, height: '100%', backgroundColor: colors.red, boxShadow: `0 0 8px ${colors.red}50` }} />
                      </div>
                      <span style={{ color: colors.red, fontWeight: '900', fontSize: '15px' }}>{Math.round(item.score)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 30px' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <StatItem icon={<Star size={14} fill={colors.gold} color={colors.gold} />} value={item.ratingCount} label="Critiques" />
                      <StatItem icon={<Share2 size={14} color="#3b82f6" />} value={item.repostCount} label="Partages" />
                      <StatItem icon={<Play size={14} color={colors.green} />} value={item.streamCount} label="Streams" />
                    </div>
                  </td>
                  <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => pinMutation.mutate(item.tmdbId)} 
                        title="Épingler en haut"
                        style={{ 
                          width: '40px', height: '40px', borderRadius: '12px', backgroundColor: colors.bg3, border: `1px solid ${colors.border}`,
                          color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.red; e.currentTarget.style.borderColor = colors.red; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.muted; e.currentTarget.style.borderColor = colors.border; }}
                      >
                        <Pin size={18} />
                      </button>
                      <button 
                        style={{ 
                          width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(229,9,20,0.05)', border: `1px solid ${colors.red}20`,
                          color: colors.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ icon, value, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
      {icon} {value}
    </div>
    <div style={{ fontSize: '10px', color: colors.muted, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>{label}</div>
  </div>
);

export default Trending;
