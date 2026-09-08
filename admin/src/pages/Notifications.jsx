import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { Send, History, Smartphone, Users, User, Mail, Bell, Sparkles, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'all',
    userId: ''
  });

  const sendMutation = useMutation({
    mutationFn: (data) => adminService.sendNotification(data),
    onSuccess: (res) => {
      toast.success(`Succès: Envoyé à ${res.data.count} utilisateurs`, {
        icon: '🚀',
        style: { borderRadius: '14px', background: colors.bg2, color: 'white', border: `1px solid ${colors.green}50` }
      });
      setFormData({ title: '', message: '', target: 'all', userId: '' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return toast.error("Veuillez remplir tous les champs obligatoires");
    sendMutation.mutate(formData);
  };

  const targetOptions = [
    { id: 'all', label: 'Tous les utilisateurs', icon: <Users size={16} />, color: '#3b82f6' },
    { id: 'free', label: 'Utilisateurs Gratuits', icon: <User size={16} />, color: colors.gold },
    { id: 'premium', label: 'Membres Premium', icon: <Sparkles size={16} />, color: colors.red },
    { id: 'user', label: 'Cible Spécifique', icon: <Mail size={16} />, color: '#a855f7' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Notification Campaign Studio" />
      
      <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
        {/* Left: Campaign Builder */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          padding: '40px', 
          borderRadius: '32px', 
          border: `1px solid ${colors.border}`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: `radial-gradient(circle, ${colors.red}10 0%, transparent 70%)`, zIndex: 0 }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '35px' }}>
              <div style={{ backgroundColor: 'rgba(229,9,20,0.1)', padding: '12px', borderRadius: '16px', color: colors.red }}>
                <Bell size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>Créer une Campagne</h3>
                <p style={{ margin: '5px 0 0 0', color: colors.muted, fontSize: '13px' }}>Configurez vos notifications push globales ou ciblées</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: colors.muted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Informations de base</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Titre de la notification (ex: 🎬 Nouveau Blockbuster !)"
                      style={{ 
                        width: '100%', padding: '18px 20px', backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, 
                        borderRadius: '16px', color: colors.text, outline: 'none', fontSize: '15px', fontWeight: '600',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = colors.red}
                      onBlur={(e) => e.target.style.borderColor = colors.border}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <textarea 
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value.substring(0, 280)})}
                      placeholder="Écrivez le contenu de votre message ici..."
                      rows="5"
                      style={{ 
                        width: '100%', padding: '18px 20px', backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, 
                        borderRadius: '16px', color: colors.text, outline: 'none', fontSize: '15px', resize: 'none',
                        lineHeight: '1.6', transition: 'all 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = colors.red}
                      onBlur={(e) => e.target.style.borderColor = colors.border}
                    />
                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', fontSize: '11px', fontWeight: 'bold', color: formData.message.length >= 280 ? colors.red : colors.muted }}>
                      {formData.message.length}/280
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: colors.muted, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Segmentation de l'audience</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {targetOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({...formData, target: opt.id})}
                      style={{
                        padding: '18px',
                        borderRadius: '18px',
                        border: `1px solid ${formData.target === opt.id ? opt.color : colors.border}`,
                        backgroundColor: formData.target === opt.id ? `${opt.color}15` : colors.bg3,
                        color: formData.target === opt.id ? opt.color : colors.text,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s',
                        boxShadow: formData.target === opt.id ? `0 8px 20px ${opt.color}20` : 'none'
                      }}
                    >
                      <div style={{ backgroundColor: formData.target === opt.id ? opt.color : colors.bg2, padding: '8px', borderRadius: '10px', color: formData.target === opt.id ? 'white' : colors.muted, display: 'flex' }}>
                        {opt.icon}
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.target === 'user' && (
                <div className="animate-fade-in">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: colors.muted, marginBottom: '12px', textTransform: 'uppercase' }}>Destinataire Unique</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
                    <input 
                      value={formData.userId}
                      onChange={(e) => setFormData({...formData, userId: e.target.value})}
                      placeholder="Email de l'utilisateur ou ID..."
                      style={{ 
                        width: '100%', padding: '18px 18px 18px 50px', backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, 
                        borderRadius: '16px', color: colors.text, outline: 'none', fontSize: '15px'
                      }}
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={sendMutation.isLoading}
                style={{ 
                  marginTop: '10px', width: '100%', padding: '20px', backgroundColor: colors.red, color: 'white', border: 'none', 
                  borderRadius: '18px', fontWeight: '900', fontSize: '16px', cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: `0 10px 30px ${colors.red}40`,
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                {sendMutation.isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                {sendMutation.isLoading ? 'Diffusion en cours...' : 'Lancer la Campagne'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Preview & Intelligence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Mobile Visualization */}
          <div style={{ backgroundColor: colors.bg2, padding: '35px', borderRadius: '32px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
              <Smartphone size={20} color={colors.muted} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Aperçu du Rendu</h3>
            </div>
            
            <div style={{ 
              width: '260px', height: '480px', border: '12px solid #1a1a1a', borderRadius: '45px', margin: '0 auto', 
              backgroundColor: '#000', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
            }}>
              <div style={{ 
                width: '100%', height: '100%', 
                backgroundImage: 'url(https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=500&auto=format&fit=crop)', 
                backgroundSize: 'cover', backgroundPosition: 'center'
              }}>
                <div style={{ padding: '60px 15px 15px 15px' }}>
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: '20px', padding: '15px', 
                    backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.3)',
                    textAlign: 'left', animation: 'slide-down 0.5s ease-out'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '22px', height: '22px', backgroundColor: colors.red, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: '900' }}>C</div>
                      <span style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: '900', letterSpacing: '0.5px' }}>CINEDZ</span>
                      <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>maintenant</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#000', lineHeight: '1.2' }}>{formData.title || 'Titre de la notification'}</div>
                    <div style={{ fontSize: '13px', color: '#333', marginTop: '4px', lineHeight: '1.4' }}>{formData.message || 'Votre message de campagne s\'affichera ici pour prévisualisation...'}</div>
                  </div>
                </div>
              </div>
              {/* iPhone Notch */}
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '25px', backgroundColor: '#1a1a1a', borderRadius: '0 0 15px 15px' }} />
            </div>
          </div>

          {/* Activity Logs */}
          <div style={{ backgroundColor: colors.bg2, padding: '35px', borderRadius: '32px', border: `1px solid ${colors.border}`, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
              <History size={22} color={colors.muted} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Historique des Diffusion</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <LogItem title="Weekend Binge Watch" target="Tous" count={4250} status="completed" date="Aujourd'hui, 10:00" />
              <LogItem title="Mise à jour Système" target="Tous" count={4250} status="completed" date="Hier, 23:45" />
              <LogItem title="Promotion Premium 50%" target="Gratuit" count={2100} status="completed" date="29 Avr, 14:20" />
              <LogItem title="Alerte Sécurité" target="Unique" count={1} status="warning" date="28 Avr, 09:10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogItem = ({ title, target, count, status, date }) => (
  <div style={{ 
    padding: '18px', backgroundColor: colors.bg3, borderRadius: '20px', border: `1px solid ${colors.border}`,
    transition: 'all 0.3s'
  }} onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.muted}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
      <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'white' }}>{title}</div>
      {status === 'completed' ? <CheckCircle size={16} color={colors.green} /> : <AlertCircle size={16} color={colors.gold} />}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: colors.muted, fontWeight: 'bold' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <span>Cible: {target}</span>
        <span style={{ color: colors.border }}>|</span>
        <span>{count.toLocaleString()} reçus</span>
      </div>
      <span>{date}</span>
    </div>
  </div>
);

export default Notifications;
