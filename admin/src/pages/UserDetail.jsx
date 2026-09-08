import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { ArrowLeft, User, Mail, Phone, Shield, ShieldAlert, Calendar, MessageSquare, Heart, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['adminUserDetail', id],
    queryFn: async () => {
      try {
        const res = await adminService.getUserDetail(id);
        return res.data;
      } catch (err) {
        console.error("Error fetching user detail:", err);
        throw err;
      }
    },
    retry: 1
  });

  const suspendMutation = useMutation({
    mutationFn: () => adminService.suspendUser(id),
    onSuccess: () => {
      toast.success("État mis à jour");
      queryClient.invalidateQueries(['adminUserDetail', id]);
    }
  });

  const banMutation = useMutation({
    mutationFn: () => adminService.banUser(id),
    onSuccess: () => {
      toast.success("État mis à jour");
      queryClient.invalidateQueries(['adminUserDetail', id]);
    }
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', flexDirection: 'column' }}>
        <Header title="Chargement..." />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <RefreshCw size={40} className="animate-spin" color={colors.red} />
          <div style={{ color: colors.muted, fontSize: '16px' }}>Récupération des données utilisateur...</div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', flexDirection: 'column' }}>
        <Header title="Erreur" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <AlertCircle size={50} color={colors.red} />
          <div style={{ color: 'white', fontSize: '18px' }}>Impossible de charger l'utilisateur.</div>
          <div style={{ color: colors.muted, fontSize: '14px' }}>{error?.message || "Erreur de connexion au serveur"}</div>
          <button 
            onClick={() => navigate('/users')}
            style={{ padding: '10px 20px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, color: 'white', borderRadius: '10px', cursor: 'pointer', marginTop: '10px' }}
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title={`Détails: ${user.name}`} />
      
      <div style={{ padding: '40px' }}>
        <button 
          onClick={() => navigate('/users')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', marginBottom: '30px', fontSize: '15px', transition: 'all 0.3s' }}
          onMouseEnter={(e) => e.target.style.color = 'white'}
          onMouseLeave={(e) => e.target.style.color = colors.muted}
        >
          <ArrowLeft size={20} /> Retour à la liste
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
          {/* Profile Card */}
          <div style={{ backgroundColor: colors.bg2, borderRadius: '28px', border: `1px solid ${colors.border}`, padding: '40px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ 
              width: '130px', height: '130px', borderRadius: '45px', backgroundColor: colors.bg3, margin: '0 auto 25px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '54px', fontWeight: 'bold', color: colors.red, border: `2px solid ${colors.border}`,
              boxShadow: `0 0 20px ${colors.red}20`
            }}>
              {user.name.charAt(0)}
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '26px', fontWeight: '800' }}>{user.name}</h2>
            <div style={{ color: colors.muted, fontSize: '13px', marginBottom: '30px', fontFamily: 'monospace' }}>{user._id}</div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '35px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: 'rgba(229,9,20,0.1)', color: colors.red, padding: '8px 18px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: `1px solid ${colors.red}30` }}>
                  {user.subscriptionTier}
                </span>
                {user.subscriptionTier === 'free' && (
                  <span style={{ fontSize: '11px', color: colors.muted, fontWeight: 'bold' }}>
                    {user.trialRemaining} jours restants
                  </span>
                )}
              </div>
              <span style={{ 
                height: 'fit-content',
                backgroundColor: user.status === 'active' ? 'rgba(0,200,83,0.1)' : 'rgba(249,115,22,0.1)', 
                color: user.status === 'active' ? colors.green : '#f97316', 
                padding: '8px 18px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: `1px solid ${user.status === 'active' ? colors.green : '#f97316'}30`
              }}>
                {user.status || 'active'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', backgroundColor: colors.bg3, padding: '25px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
              <InfoRow icon={<Mail size={18} />} label="Email" value={user.email || 'N/A'} />
              <InfoRow icon={<Phone size={18} />} label="Téléphone" value={user.phone || 'N/A'} />
              <InfoRow icon={<Calendar size={18} />} label="Membre depuis" value={new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
            </div>

            <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => suspendMutation.mutate()}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', transition: 'all 0.3s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <Shield size={18} color="#f97316" /> {user.status === 'suspended' ? 'Réactiver le compte' : 'Suspendre le compte'}
              </button>
              <button 
                onClick={() => banMutation.mutate()}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: 'rgba(229,9,20,0.1)', color: colors.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', transition: 'all 0.3s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(229,9,20,0.2)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(229,9,20,0.1)'}
              >
                <ShieldAlert size={18} /> {user.status === 'banned' ? 'Débannir l\'utilisateur' : 'Bannir l\'utilisateur'}
              </button>
            </div>
          </div>

          {/* Activity Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <StatBox icon={<MessageSquare size={26} color="#3b82f6" />} label="Total Publications" value={user.stats?.postsCount || 0} />
              <StatBox icon={<Heart size={26} color={colors.red} />} label="Total Réactions" value={user.stats?.likesCount || 0} />
            </div>

            <div style={{ backgroundColor: colors.bg2, borderRadius: '28px', border: `1px solid ${colors.border}`, padding: '35px', flex: 1, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 25px 0', fontSize: '20px', fontWeight: '800' }}>Flux d'activité récent</h3>
              {user.recentPosts?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {user.recentPosts.map(post => (
                    <div key={post._id} style={{ padding: '20px', backgroundColor: colors.bg3, borderRadius: '18px', border: `1px solid ${colors.border}`, transition: 'all 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.muted} onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{post.title}</div>
                        <div style={{ fontSize: '11px', color: colors.muted }}>{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: colors.muted, lineHeight: '1.5', fontStyle: 'italic' }}>"{post.review?.substring(0, 150)}..."</div>
                      <div style={{ display: 'flex', gap: '20px', marginTop: '15px', fontSize: '12px', color: colors.muted }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Heart size={14} color={colors.red} /> {post.likesCount}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MessageSquare size={14} color="#3b82f6" /> {post.commentsCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: colors.muted }}>
                  <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                  <div style={{ fontStyle: 'italic' }}>Aucune publication enregistrée.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
    <div style={{ backgroundColor: colors.bg2, padding: '10px', borderRadius: '12px', color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '10px', color: colors.muted, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginTop: '2px' }}>{value}</div>
    </div>
  </div>
);

const StatBox = ({ icon, label, value }) => (
  <div style={{ backgroundColor: colors.bg2, padding: '30px', borderRadius: '28px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '25px', transition: 'all 0.3s', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
    <div style={{ backgroundColor: colors.bg3, padding: '18px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>{icon}</div>
    <div>
      <div style={{ fontSize: '13px', color: colors.muted, fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', marginTop: '5px' }}>{value}</div>
    </div>
  </div>
);

export default UserDetail;
