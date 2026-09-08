import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { Eye, Trash2, EyeOff, ShieldAlert, MessageCircle, Heart, Star, Calendar, Search, RefreshCw, Film } from 'lucide-react';
import toast from 'react-hot-toast';

const Posts = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminPosts', filter, page, search],
    queryFn: () => adminService.getPosts({ filter, page, search }).then(res => res.data)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (window.confirm("Voulez-vous vraiment supprimer cette publication ?")) {
        return adminService.deletePost(id);
      }
      throw new Error("Annulé");
    },
    onSuccess: () => {
      toast.success("Publication supprimée");
      queryClient.invalidateQueries(['adminPosts']);
    }
  });

  const hideMutation = useMutation({
    mutationFn: (id) => adminService.hidePost(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries(['adminPosts']);
    }
  });

  const banMutation = useMutation({
    mutationFn: (userId) => {
      if (window.confirm("Voulez-vous vraiment bannir cet utilisateur ?")) {
        return adminService.banUser(userId);
      }
      throw new Error("Annulé");
    },
    onSuccess: () => {
      toast.success("Utilisateur banni");
      queryClient.invalidateQueries(['adminPosts']);
    }
  });

  const tabs = [
    { id: 'all', label: 'Toutes les publications' },
    { id: 'reported', label: 'Signalements' },
    { id: 'hidden', label: 'Masquées' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Gestion des Publications" />
      
      <div style={{ padding: '40px' }}>
        {/* Controls Bar */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          padding: '20px', 
          borderRadius: '18px', 
          border: `1px solid ${colors.border}`,
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: colors.bg3, padding: '6px', borderRadius: '14px', border: `1px solid ${colors.border}` }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setFilter(tab.id); setPage(1); }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: filter === tab.id ? colors.red : 'transparent',
                  color: filter === tab.id ? 'white' : colors.muted,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  transition: 'all 0.3s',
                  boxShadow: filter === tab.id ? '0 4px 12px rgba(229, 9, 20, 0.3)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
            <input 
              type="text" 
              placeholder="Rechercher par film ou utilisateur..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                backgroundColor: colors.bg3,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '12px 15px 12px 45px',
                color: colors.text,
                width: '350px',
                outline: 'none',
                fontSize: '14px',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.red}
              onBlur={(e) => e.target.style.borderColor = colors.border}
            />
          </div>
        </div>

        {/* Posts Table */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          border: `1px solid ${colors.border}`, 
          borderRadius: '24px', 
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: colors.bg3, color: colors.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <tr>
                <th style={{ padding: '20px 25px' }}>Auteur</th>
                <th style={{ padding: '20px 25px' }}>Contenu & Critique</th>
                <th style={{ padding: '20px 25px' }}>Engagement</th>
                <th style={{ padding: '20px 25px' }}>Date de Publication</th>
                <th style={{ padding: '20px 25px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}><RefreshCw className="animate-spin" color={colors.red} size={30} /></td></tr>
              ) : data?.posts?.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center', color: colors.muted }}>Aucune publication trouvée.</td></tr>
              ) : data?.posts?.map((post) => (
                <tr 
                  key={post._id} 
                  style={{ 
                    borderTop: `1px solid ${colors.border}`, 
                    transition: 'all 0.2s',
                    backgroundColor: post.isHidden ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = post.isHidden ? 'rgba(255,255,255,0.02)' : 'transparent'}
                >
                  <td style={{ padding: '20px 25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={post.userId?.avatar || `https://ui-avatars.com/api/?name=${post.userId?.name}&background=random`} 
                          style={{ width: '40px', height: '40px', borderRadius: '12px', marginRight: '15px', border: `1px solid ${colors.border}` }} 
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{post.userId?.name}</div>
                        <div style={{ fontSize: '12px', color: colors.muted }}>{post.userId?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ 
                        width: '35px', height: '50px', backgroundColor: colors.bg3, borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                        border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {post.posterPath ? (
                          <img src={`https://image.tmdb.org/t/p/w92${post.posterPath}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Film size={18} color={colors.muted} />
                        )}
                      </div>
                      <div style={{ maxWidth: '300px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'white' }}>{post.title}</div>
                        <div style={{ fontSize: '13px', color: colors.muted, marginTop: '4px', lineHeight: '1.4' }}>
                          "{post.review?.substring(0, 80)}{post.review?.length > 80 ? '...' : ''}"
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 25px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: 'rgba(255,215,0,0.1)', color: colors.gold, padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold' }}>
                        <Star size={14} fill={colors.gold} /> {post.rating?.toFixed(1)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: colors.muted }}>
                        <Heart size={14} color={colors.red} /> {post.likesCount}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: colors.muted }}>
                        <MessageCircle size={14} color="#3b82f6" /> {post.commentsCount}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 25px', color: colors.muted, fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} />
                      {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </div>
                  </td>
                  <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <ActionButton 
                        onClick={() => hideMutation.mutate(post._id)} 
                        icon={post.isHidden ? <Eye size={18} /> : <EyeOff size={18} />} 
                        label={post.isHidden ? "Afficher" : "Masquer"}
                        active={post.isHidden}
                      />
                      <ActionButton 
                        onClick={() => deleteMutation.mutate(post._id)} 
                        icon={<Trash2 size={18} />} 
                        label="Supprimer"
                        danger
                      />
                      <ActionButton 
                        onClick={() => banMutation.mutate(post.userId?._id)} 
                        icon={<ShieldAlert size={18} />} 
                        label="Bannir Auteur"
                        danger
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', gap: '12px', alignItems: 'center' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)} 
              style={{ padding: '10px 20px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, color: page === 1 ? colors.muted : 'white', borderRadius: '12px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              Précédent
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[...Array(data.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    backgroundColor: page === i + 1 ? colors.red : colors.bg2,
                    color: 'white', border: `1px solid ${page === i + 1 ? colors.red : colors.border}`,
                    fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={page >= data.totalPages} 
              onClick={() => setPage(p => p + 1)} 
              style={{ padding: '10px 20px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, color: page >= data.totalPages ? colors.muted : 'white', borderRadius: '12px', cursor: page >= data.totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ActionButton = ({ icon, onClick, label, danger, active }) => (
  <button 
    onClick={onClick} 
    title={label}
    style={{ 
      width: '38px', height: '38px', borderRadius: '10px', 
      backgroundColor: active ? colors.red : colors.bg3, 
      border: `1px solid ${active ? colors.red : colors.border}`,
      color: active ? 'white' : (danger ? colors.red : colors.muted), 
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.3s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.1)';
      if (!active) {
        e.currentTarget.style.backgroundColor = danger ? 'rgba(229, 9, 20, 0.1)' : 'rgba(255,255,255,0.05)';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
      if (!active) {
        e.currentTarget.style.backgroundColor = colors.bg3;
      }
    }}
  >
    {icon}
  </button>
);

export default Posts;
