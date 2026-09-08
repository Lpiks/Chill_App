import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { Save, Shield, Settings as SettingsIcon, CreditCard, UserPlus, Trash2, AlertTriangle, Globe, Lock, Key, Server, RefreshCw, Sparkles, Tv, Smartphone, Activity, Users, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => adminService.getSettings().then(res => res.data)
  });

  useEffect(() => {
    if (data) {
      setLocalSettings(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (newData) => adminService.updateSettings(newData),
    onSuccess: () => {
      toast.success("Configuration système mise à jour", {
        icon: '⚙️',
        style: { borderRadius: '14px', background: colors.bg2, color: 'white' }
      });
      queryClient.invalidateQueries(['adminSettings']);
    }
  });

  if (isLoading || !localSettings) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', flexDirection: 'column' }}>
        <Header title="Paramètres" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw className="animate-spin" color={colors.red} size={40} />
        </div>
      </div>
    );
  }

  const handleToggle = (key) => {
    setLocalSettings({ ...localSettings, [key]: !localSettings[key] });
  };

  const handleFeatureChange = (tier, feature, value) => {
    setLocalSettings({
      ...localSettings,
      pricing: {
        ...localSettings.pricing,
        [tier]: { ...localSettings.pricing[tier], [feature]: value }
      }
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Configuration du Système" />
      
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', alignItems: 'start' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* General Settings */}
            <Section title="Général & Plateforme" icon={<Globe size={22} color={colors.red} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: '800' }}>Mode Maintenance</h4>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: colors.muted }}>Désactive l'accès public. Seuls les admins peuvent se connecter.</p>
                  </div>
                  <FeatureSwitch 
                    active={localSettings.maintenanceMode} 
                    onToggle={() => setLocalSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))} 
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${colors.border}`, paddingTop: '25px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: '800' }}>Inscriptions Ouvertes</h4>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: colors.muted }}>Permet aux nouveaux utilisateurs de créer un compte.</p>
                  </div>
                  <FeatureSwitch 
                    active={localSettings.registrationsEnabled} 
                    onToggle={() => setLocalSettings(prev => ({ ...prev, registrationsEnabled: !prev.registrationsEnabled }))} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '25px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: '800' }}>Période d'Essai</h4>
                      <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: colors.muted }}>Activer le mode découverte pour les nouveaux membres.</p>
                    </div>
                    <FeatureSwitch 
                      active={localSettings.trialEnabled} 
                      onToggle={() => setLocalSettings(prev => ({ ...prev, trialEnabled: !prev.trialEnabled }))} 
                    />
                  </div>
                  
                  {localSettings.trialEnabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                      <span style={{ fontSize: '13px', color: colors.muted, fontWeight: 'bold' }}>Durée :</span>
                      <input 
                        type="number" 
                        value={localSettings.trialDays} 
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, trialDays: parseInt(e.target.value) }))}
                        style={{ width: '80px', padding: '10px 15px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: '12px', color: 'white', fontWeight: '900', outline: 'none' }}
                      />
                      <span style={{ fontSize: '13px', color: colors.muted, fontWeight: 'bold' }}>jours calendaires</span>
                      <div style={{ width: '2px', height: '20px', backgroundColor: colors.red, marginLeft: 'auto' }} />
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* System & Business Pulse - Fills the Layout Gap */}
            <Section title="État du Système & Croissance" icon={<Activity size={22} color="#10b981" />}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Operational Status */}
                <div style={{ 
                  gridColumn: 'span 2', padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                  borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex', alignItems: 'center', gap: '15px'
                }}>
                  <div style={{ position: 'relative', width: '12px', height: '12px' }}>
                    <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#10b981', borderRadius: '50%' }} />
                    <div style={{ 
                      position: 'absolute', width: '100%', height: '100%', backgroundColor: '#10b981', borderRadius: '50%',
                      animation: 'pulse 2s infinite', opacity: 0.5
                    }} />
                  </div>
                  <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '900', letterSpacing: '0.5px' }}>SYSTÈME OPÉRATIONNEL</span>
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: colors.muted, fontWeight: 'bold' }}>Latence: 24ms</div>
                </div>

                {/* Quick Stats */}
                <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.muted, marginBottom: '10px' }}>
                    <Users size={14} /> <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>UTILISATEURS</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>1,284</div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '5px', fontWeight: 'bold' }}>+12 aujourd'hui</div>
                </div>

                <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.muted, marginBottom: '10px' }}>
                    <CreditCard size={14} /> <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>PREMIUM</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: colors.gold }}>452</div>
                  <div style={{ fontSize: '11px', color: colors.gold, marginTop: '5px', fontWeight: 'bold' }}>35% de conversion</div>
                </div>

                <div style={{ 
                  gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '15px 20px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: colors.muted, fontWeight: 'bold' }}>
                    <RefreshCw size={14} /> Dernière synchronisation: Il y a 5 min
                  </div>
                  <div style={{ color: colors.muted }}><ChevronRight size={16} /></div>
                </div>
              </div>
            </Section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Security & Admins */}
            <Section title="Sécurité & Accès" icon={<Shield size={22} color="#3b82f6" />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                <AdminItem name="Elhadi Admin" email="elhadi@cinedz.com" role="Super Admin" />
                <AdminItem name="Staff Cinedz" email="moderator@cinedz.com" role="Modérateur" isRemovable />
              </div>
              <button style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px', 
                backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: 'white', 
                borderRadius: '16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s'
              }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                <UserPlus size={18} /> Nouvel Administrateur
              </button>
            </Section>

            {/* Danger Zone */}
            <Section title="Zone de Danger" icon={<AlertTriangle size={22} color={colors.red} />}>
              <p style={{ fontSize: '13px', color: colors.muted, marginBottom: '20px', lineHeight: '1.5' }}>Les actions ci-dessous sont irréversibles et impactent l'intégralité de la base de données.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <DangerAction label="Vider les Logs système" icon={<Server size={16} />} />
                <DangerAction label="Réinitialiser les Tendances" icon={<RefreshCw size={16} />} />
                <DangerAction label="Supprimer tous les comptes inactifs" icon={<Trash2 size={16} />} danger />
              </div>
            </Section>
          </div>
        </div>

        {/* Pricing & Permissions Settings - Moved to Bottom for Full Width */}
        <div style={{ marginTop: '40px' }}>
          <Section title="Plans & Droits d'Accès" icon={<CreditCard size={22} color={colors.gold} />}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px' }}>
              {localSettings.pricing && ['basic', 'standard', 'premium'].map(tier => (
                <div key={tier} style={{ 
                  backgroundColor: colors.bg3, borderRadius: '32px', border: `1px solid ${colors.border}`,
                  position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default'
                }}>
                  {/* Tier Glow Header */}
                  <div style={{ 
                    height: '6px', 
                    background: tier === 'premium' ? `linear-gradient(90deg, ${colors.gold}, #ff9d00)` : 
                                 (tier === 'standard' ? `linear-gradient(90deg, ${colors.red}, #ff4d4d)` : 
                                 `linear-gradient(90deg, #666, #999)`)
                  }} />
                  
                  <div style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                      <h4 style={{ margin: 0, textTransform: 'uppercase', fontSize: '15px', fontWeight: '900', letterSpacing: '2px', color: tier === 'premium' ? colors.gold : 'white' }}>
                        {tier}
                      </h4>
                      {tier === 'premium' ? <Sparkles size={18} color={colors.gold} /> : (tier === 'standard' ? <Shield size={18} color={colors.red} /> : <Globe size={18} color={colors.muted} />)}
                    </div>

                    {/* Pricing Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '35px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: colors.muted, marginBottom: '8px', letterSpacing: '1px' }}>MENSUEL</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" 
                            value={localSettings.pricing[tier]?.monthly || 0} 
                            onChange={(e) => handlePricingChange(tier, 'monthly', e.target.value)}
                            style={{ 
                              width: '100%', padding: '16px 55px 16px 15px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, 
                              borderRadius: '16px', color: 'white', fontWeight: '900', outline: 'none', fontSize: '18px',
                              transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = tier === 'premium' ? colors.gold : colors.red}
                            onBlur={(e) => e.target.style.borderColor = colors.border}
                          />
                          <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '900', color: tier === 'premium' ? colors.gold : colors.muted, opacity: 0.8 }}>DZD</span>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: colors.muted, marginBottom: '8px', letterSpacing: '1px' }}>ANNUEL</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" 
                            value={localSettings.pricing[tier]?.yearly || 0} 
                            onChange={(e) => handlePricingChange(tier, 'yearly', e.target.value)}
                            style={{ 
                              width: '100%', padding: '16px 55px 16px 15px', backgroundColor: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, 
                              borderRadius: '16px', color: 'white', fontWeight: '900', outline: 'none', fontSize: '18px',
                              transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = tier === 'premium' ? colors.gold : colors.red}
                            onBlur={(e) => e.target.style.borderColor = colors.border}
                          />
                          <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '900', color: tier === 'premium' ? colors.gold : colors.muted, opacity: 0.8 }}>DZD</span>
                        </div>
                      </div>
                    </div>

                    {/* Access Rights List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '900', color: colors.muted, letterSpacing: '1.5px', marginBottom: '8px', opacity: 0.8 }}>DROITS D'ACCÈS</div>
                      
                      {/* Quality Select */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: `1px solid ${colors.border}`, transition: 'all 0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>
                          <Tv size={14} color={colors.red} /> Qualité
                        </div>
                        <select 
                          value={localSettings.pricing[tier]?.quality || '1080p'}
                          onChange={(e) => handleFeatureChange(tier, 'quality', e.target.value)}
                          style={{ backgroundColor: 'transparent', border: 'none', color: 'white', fontWeight: '900', outline: 'none', cursor: 'pointer', fontSize: '13px', textAlign: 'right' }}
                        >
                          <option value="480p">SD</option>
                          <option value="720p">HD</option>
                          <option value="1080p">FHD</option>
                          <option value="4K+HDR">4K</option>
                        </select>
                      </div>

                      {/* Screens Input */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: `1px solid ${colors.border}`, transition: 'all 0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>
                          <Smartphone size={14} color={colors.red} /> Écrans
                        </div>
                        <input 
                          type="number"
                          value={localSettings.pricing[tier]?.maxScreens || 1}
                          onChange={(e) => handleFeatureChange(tier, 'maxScreens', parseInt(e.target.value))}
                          style={{ backgroundColor: 'transparent', border: 'none', color: 'white', fontWeight: '900', outline: 'none', width: '50px', textAlign: 'right', fontSize: '14px' }}
                        />
                      </div>

                      {/* Boolean Toggles */}
                      <FeatureSwitchMinimal 
                        label="Sans Publicité" 
                        active={localSettings.pricing[tier]?.adFree} 
                        onToggle={() => handleFeatureChange(tier, 'adFree', !localSettings.pricing[tier]?.adFree)} 
                      />
                      <FeatureSwitchMinimal 
                        label="Mode Hors-ligne" 
                        active={localSettings.pricing[tier]?.offlineAccess} 
                        onToggle={() => handleFeatureChange(tier, 'offlineAccess', !localSettings.pricing[tier]?.offlineAccess)} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Floating Premium Save Button */}
        <div style={{ position: 'sticky', bottom: '40px', display: 'flex', justifyContent: 'center', marginTop: '60px', zIndex: 100 }}>
          <button 
            onClick={() => saveMutation.mutate(localSettings)}
            disabled={saveMutation.isLoading}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '15px', padding: '20px 50px', 
              backgroundColor: colors.red, color: 'white', border: 'none', 
              borderRadius: '24px', cursor: 'pointer', fontWeight: '900', fontSize: '18px',
              boxShadow: '0 15px 40px rgba(229, 9, 20, 0.4)', transition: 'all 0.3s',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px) scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0) scale(1)'}
          >
            {saveMutation.isLoading ? <RefreshCw className="animate-spin" size={22} /> : <Save size={22} />}
            {saveMutation.isLoading ? 'Synchronisation...' : 'Appliquer la Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div style={{ backgroundColor: colors.bg2, padding: '35px', borderRadius: '32px', border: `1px solid ${colors.border}`, boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px' }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{title}</h3>
    </div>
    {children}
  </div>
);

const ToggleItem = ({ title, subtitle, active, onToggle, warning }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: warning ? 'rgba(229,9,20,0.05)' : 'rgba(255,255,255,0.01)', borderRadius: '20px', border: `1px solid ${warning ? colors.red + '30' : 'transparent'}`, transition: 'all 0.3s' }}>
    <div style={{ flex: 1, paddingRight: '20px' }}>
      <div style={{ fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: warning ? colors.red : 'white' }}>
        {title}
        {warning && <AlertTriangle size={16} />}
      </div>
      <div style={{ fontSize: '13px', color: colors.muted, marginTop: '4px', lineHeight: '1.4' }}>{subtitle}</div>
    </div>
    <div 
      onClick={onToggle}
      style={{ 
        width: '56px', height: '30px', backgroundColor: active ? colors.red : colors.bg3, 
        borderRadius: '15px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s',
        border: `1px solid ${active ? colors.red : colors.border}`
      }}
    >
      <div style={{ 
        width: '22px', height: '22px', backgroundColor: 'white', borderRadius: '50%', 
        position: 'absolute', top: '3px', left: active ? '29px' : '3px', transition: 'all 0.3s',
        boxShadow: active ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
      }} />
    </div>
  </div>
);

const AdminItem = ({ name, email, role, isRemovable }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: colors.bg3, borderRadius: '16px', border: `1px solid ${colors.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: colors.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', border: `1px solid ${colors.border}`, color: colors.red }}>{name.charAt(0)}</div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{name}</div>
        <div style={{ fontSize: '12px', color: colors.muted }}>{email} <span style={{ color: colors.red, fontSize: '10px', marginLeft: '5px' }}>• {role}</span></div>
      </div>
    </div>
    {isRemovable && <button style={{ background: 'none', border: 'none', color: colors.red, cursor: 'pointer', opacity: 0.6 }} onMouseEnter={(e) => e.target.style.opacity = 1} onMouseLeave={(e) => e.target.style.opacity = 0.6}><Trash2 size={18} /></button>}
  </div>
);

const DangerAction = ({ label, icon, danger }) => (
  <button style={{ 
    width: '100%', padding: '12px 18px', backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`, 
    borderRadius: '12px', color: danger ? colors.red : colors.muted, fontSize: '13px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.3s'
  }} onMouseEnter={(e) => { e.target.style.backgroundColor = danger ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.05)'; e.target.style.borderColor = danger ? colors.red : colors.muted; }}>
    {icon} {label}
  </button>
);

const FeatureSwitch = ({ label, subtitle, active, onToggle }) => (
  <div 
    onClick={onToggle}
    style={{ 
      padding: '16px 20px', borderRadius: '20px', cursor: 'pointer',
      backgroundColor: active ? 'rgba(229, 9, 20, 0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${active ? colors.red + '40' : colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: active ? `0 4px 15px ${colors.red}10` : 'none'
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '13px', fontWeight: '800', color: active ? 'white' : colors.muted, transition: 'all 0.3s' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '11px', color: colors.muted, marginTop: '2px', opacity: 0.7 }}>{subtitle}</div>}
    </div>
    <div 
      style={{ 
        width: '44px', height: '24px', backgroundColor: active ? colors.red : colors.bg3, 
        borderRadius: '12px', position: 'relative', transition: 'all 0.3s',
        border: `1px solid ${active ? colors.red : colors.border}`
      }}
    >
      <div style={{ 
        width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', 
        position: 'absolute', top: '2px', left: active ? '22px' : '2px', transition: 'all 0.3s',
        boxShadow: active ? '0 0 8px white' : 'none'
      }} />
    </div>
  </div>
);

const FeatureSwitchMinimal = ({ label, active, onToggle }) => (
  <div 
    onClick={onToggle}
    style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '12px 15px', backgroundColor: active ? 'rgba(229, 9, 20, 0.05)' : 'rgba(255,255,255,0.02)', 
      borderRadius: '15px', border: `1px solid ${active ? colors.red + '40' : colors.border}`,
      cursor: 'pointer', transition: 'all 0.3s'
    }}
  >
    <span style={{ fontSize: '12px', fontWeight: 'bold', color: active ? 'white' : colors.muted }}>{label}</span>
    <div 
      style={{ 
        width: '34px', height: '18px', backgroundColor: active ? colors.red : colors.bg3, 
        borderRadius: '10px', position: 'relative', transition: 'all 0.3s',
        border: `1px solid ${active ? colors.red : colors.border}`
      }}
    >
      <div style={{ 
        width: '12px', height: '12px', backgroundColor: 'white', borderRadius: '50%', 
        position: 'absolute', top: '2px', left: active ? '18px' : '2px', transition: 'all 0.3s',
        boxShadow: active ? '0 0 5px white' : 'none'
      }} />
    </div>
  </div>
);

export default Settings;
