import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import CustomDropdown from '../components/CustomDropdown';
import { colors } from '../constants/colors';
import { Search, Eye, MoreVertical, Shield, ShieldAlert, Trash2, UserPlus, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Badge = ({ tier }) => {
  const styles = {
    free: { bg: 'rgba(136, 136, 136, 0.1)', color: '#888888', border: 'rgba(136, 136, 136, 0.2)' },
    basic: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
    standard: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.2)' },
    premium: { bg: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', border: 'rgba(245, 197, 24, 0.2)' },
  };
  const style = styles[tier] || styles.free;
  return (
    <span style={{
      backgroundColor: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '10px',
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>{tier}</span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    active: { color: colors.green, label: 'Actif' },
    suspended: { color: '#f97316', label: 'Suspendu' },
    banned: { color: colors.red, label: 'Banni' },
  };
  const style = styles[status] || styles.active;
  return (
    <span style={{ 
      color: style.color, 
      fontSize: '13px', 
      fontWeight: '600',
      display: 'flex', 
      alignItems: 'center',
      backgroundColor: `${style.color}10`,
      padding: '4px 10px',
      borderRadius: '8px',
      width: 'fit-content'
    }}>
      <div style={{ 
        width: '6px', 
        height: '6px', 
        borderRadius: '50%', 
        backgroundColor: style.color, 
        marginRight: '8px',
        boxShadow: `0 0 8px ${style.color}`
      }} />
      {style.label}
    </span>
  );
};

const Users = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search, filterTier, filterStatus],
    queryFn: () => adminService.getUsers({ page, search, tier: filterTier, status: filterStatus }).then(res => res.data)
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (data) => adminService.createUser(data),
    onSuccess: () => {
      toast.success("Utilisateur créé avec succès");
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '' });
      queryClient.invalidateQueries(['adminUsers']);
    }
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => adminService.suspendUser(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries(['adminUsers']);
    }
  });

  const banMutation = useMutation({
    mutationFn: (id) => adminService.banUser(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries(['adminUsers']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (window.confirm("Supprimer cet utilisateur ? Action irréversible.")) {
        return adminService.deleteUser(id);
      }
      throw new Error("Annulé");
    },
    onSuccess: () => {
      toast.success("Supprimé");
      queryClient.invalidateQueries(['adminUsers']);
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, tier }) => adminService.updateSubscription(id, tier),
    onSuccess: () => {
      toast.success("Plan mis à jour");
      queryClient.invalidateQueries(['adminUsers']);
    }
  });

  const tierOptions = [
    { value: '', label: 'Tous les abonnements' },
    { value: 'free', label: 'Free' },
    { value: 'basic', label: 'Basic' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
  ];

  const statusOptions = [
    { value: '', label: 'Tous les status' },
    { value: 'active', label: 'Actif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'banned', label: 'Banni' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Gestion des Utilisateurs" />
      
      <div style={{ padding: '40px' }}>
        {/* Top Controls Box */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          padding: '20px', 
          borderRadius: '16px', 
          border: `1px solid ${colors.border}`,
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  backgroundColor: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '12px 15px 12px 45px',
                  color: colors.text,
                  width: '300px',
                  outline: 'none',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              />
            </div>
            
            <CustomDropdown 
              value={filterTier} 
              onChange={(val) => { setFilterTier(val); setPage(1); }} 
              options={tierOptions} 
              placeholder="Abonnement" 
            />

            <CustomDropdown 
              value={filterStatus} 
              onChange={(val) => { setFilterStatus(val); setPage(1); }} 
              options={statusOptions} 
              placeholder="Status" 
              width="180px"
            />

            {(search || filterTier || filterStatus) && (
              <button 
                onClick={() => { setSearch(''); setFilterTier(''); setFilterStatus(''); setPage(1); }}
                style={{ 
                  backgroundColor: 'rgba(229, 9, 20, 0.1)', 
                  border: 'none', 
                  color: colors.red, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '10px 15px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                <RefreshCw size={14} style={{ marginRight: '8px' }} /> Réinitialiser
              </button>
            )}
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: colors.red,
              color: 'white',
              border: 'none',
              padding: '12px 25px',
              borderRadius: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 5px 15px rgba(229, 9, 20, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <UserPlus size={18} style={{ marginRight: '10px' }} />
            Nouvel Utilisateur
          </button>
        </div>

        {/* User Table */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          border: `1px solid ${colors.border}`, 
          borderRadius: '20px', 
          overflow: 'visible',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: colors.bg3, color: colors.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <tr>
                <th style={{ padding: '20px 25px', borderTopLeftRadius: '20px' }}>Profil Utilisateur</th>
                <th style={{ padding: '20px 25px' }}>Niveau de Plan</th>
                <th style={{ padding: '20px 25px' }}>Date de création</th>
                <th style={{ padding: '20px 25px' }}>État du compte</th>
                <th style={{ padding: '20px 25px', textAlign: 'right', borderTopRightRadius: '20px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}><RefreshCw className="animate-spin" color={colors.red} /></td></tr>
              ) : data?.users?.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center', color: colors.muted }}>Aucun résultat trouvé.</td></tr>
              ) : data?.users?.map((user) => (
                <tr 
                  key={user._id} 
                  style={{ borderTop: `1px solid ${colors.border}`, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '20px 25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '12px', 
                        backgroundColor: colors.bg3, 
                        marginRight: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: colors.red,
                        border: `1px solid ${colors.border}`,
                        fontSize: '18px'
                      }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: colors.muted, marginTop: '2px' }}>{user.email || user.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 25px' }}>
                    <Badge tier={user.subscriptionTier} />
                  </td>
                  <td style={{ padding: '20px 25px', color: colors.muted, fontSize: '14px' }}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '20px 25px' }}>
                    <StatusBadge status={user.status || 'active'} />
                  </td>
                  <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => navigate(`/users/${user._id}`)}
                        style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', 
                          backgroundColor: colors.bg3, border: `1px solid ${colors.border}`,
                          color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.text; e.currentTarget.style.borderColor = colors.muted; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.muted; e.currentTarget.style.borderColor = colors.border; }}
                      >
                        <Eye size={18} />
                      </button>
                      
                      <div style={{ position: 'relative' }}>
                        <button 
                          onClick={() => setActiveMenu(activeMenu === user._id ? null : user._id)}
                          style={{ 
                            width: '36px', height: '36px', borderRadius: '10px', 
                            backgroundColor: colors.bg3, border: `1px solid ${colors.border}`,
                            color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s'
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeMenu === user._id && (
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '45px',
                            backgroundColor: '#111118',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                            zIndex: 100,
                            width: '200px',
                            overflow: 'hidden',
                            padding: '6px'
                          }}>
                            <MenuButton icon={<Shield size={16} color="#f97316" />} label={user.status === 'suspended' ? 'Activer' : 'Suspendre'} onClick={() => { suspendMutation.mutate(user._id); setActiveMenu(null); }} />
                            <MenuButton icon={<ShieldAlert size={16} color={colors.red} />} label={user.status === 'banned' ? 'Débannir' : 'Bannir'} onClick={() => { banMutation.mutate(user._id); setActiveMenu(null); }} />
                            
                            <div style={{ height: '1px', backgroundColor: colors.border, margin: '6px 0' }} />
                            <div style={{ padding: '6px 12px', fontSize: '10px', color: colors.muted, fontWeight: 'bold' }}>MODIFIER PLAN</div>
                            
                            {['free', 'basic', 'standard', 'premium'].map(t => (
                              <button 
                                key={t}
                                onClick={() => { updateTierMutation.mutate({ id: user._id, tier: t }); setActiveMenu(null); }}
                                style={{ 
                                  width: '100%', padding: '10px 12px', textAlign: 'left', background: 'none', border: 'none', 
                                  color: t === user.subscriptionTier ? colors.red : colors.text, 
                                  cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize',
                                  borderRadius: '6px', transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                {t}
                              </button>
                            ))}
                            
                            <div style={{ height: '1px', backgroundColor: colors.border, margin: '6px 0' }} />
                            <MenuButton icon={<Trash2 size={16} color={colors.red} />} label="Supprimer" danger onClick={() => { deleteMutation.mutate(user._id); setActiveMenu(null); }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', gap: '15px', alignItems: 'center' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ 
              padding: '10px 20px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, 
              color: page === 1 ? colors.muted : colors.text, borderRadius: '12px', 
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            Précédent
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {[...Array(data?.totalPages || 1)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  border: `1px solid ${page === i + 1 ? colors.red : colors.border}`,
                  backgroundColor: page === i + 1 ? colors.red : colors.bg2,
                  color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            disabled={page >= (data?.totalPages || 1)}
            onClick={() => setPage(p => p + 1)}
            style={{ 
              padding: '10px 20px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, 
              color: page >= (data?.totalPages || 1) ? colors.muted : colors.text, borderRadius: '12px', 
              cursor: page >= (data?.totalPages || 1) ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div style={{
            width: '450px', backgroundColor: colors.bg2, padding: '40px',
            borderRadius: '24px', border: `1px solid ${colors.border}`, position: 'relative',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer' }}><X size={24} /></button>
            <h3 style={{ margin: '0 0 30px 0', fontSize: '24px', fontWeight: '800' }}>Nouvel Utilisateur</h3>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(newUser); }}>
              <ModalInput label="Nom complet" value={newUser.name} onChange={(val) => setNewUser({...newUser, name: val})} />
              <ModalInput label="Email" type="email" value={newUser.email} onChange={(val) => setNewUser({...newUser, email: val})} />
              <ModalInput label="Mot de passe" type="password" value={newUser.password} onChange={(val) => setNewUser({...newUser, password: val})} />
              <button type="submit" disabled={addMutation.isLoading} style={{ width: '100%', padding: '15px', backgroundColor: colors.red, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxShadow: '0 5px 15px rgba(229, 9, 20, 0.3)' }}>
                {addMutation.isLoading ? 'Traitement...' : 'Créer le compte'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeMenu && <div onClick={() => setActiveMenu(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />}
    </div>
  );
};

const MenuButton = ({ icon, label, onClick, danger }) => (
  <button 
    onClick={onClick} 
    style={{ width: '100%', padding: '12px 15px', textAlign: 'left', background: 'none', border: 'none', color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '13px', borderRadius: '8px', transition: 'all 0.2s' }}
    onMouseEnter={(e) => e.target.style.backgroundColor = danger ? 'rgba(229, 9, 20, 0.1)' : 'rgba(255,255,255,0.05)'}
    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
  >
    <span style={{ marginRight: '12px' }}>{icon}</span>
    {label}
  </button>
);

const ModalInput = ({ label, type = 'text', value, onChange }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', fontSize: '12px', color: colors.muted, marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</label>
    <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '14px', backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, borderRadius: '12px', color: colors.text, outline: 'none', fontSize: '15px' }} />
  </div>
);

export default Users;
