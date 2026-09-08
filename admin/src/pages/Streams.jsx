import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { Activity, Zap, Play, Database, Trash2, Clock, Server, Wifi, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Streams = () => {
  const queryClient = useQueryClient();

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['adminStreamStatus'],
    queryFn: () => adminService.getStreamStatus().then(res => res.data),
    refetchInterval: 30000 // Refetch every 30 seconds for "live" feel
  });

  const { data: popular, isLoading: loadingPopular } = useQuery({
    queryKey: ['adminPopularStreams'],
    queryFn: () => adminService.getPopularStreams().then(res => res.data)
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => {
      if (window.confirm("CRITICAL: Voulez-vous vraiment vider tout le cache des streams ? Cela pourrait ralentir temporairement les lectures.")) {
        return adminService.clearCache();
      }
      throw new Error("Annulé");
    },
    onSuccess: () => {
      toast.success("Cache système réinitialisé");
    }
  });

  // Mock server vitals
  const vitals = [
    { label: 'CPU Usage', value: '24%', color: colors.green, icon: <Cpu size={16} /> },
    { label: 'RAM Memory', value: '4.2GB / 8GB', color: colors.gold, icon: <HardDrive size={16} /> },
    { label: 'Uptime', value: '12d 4h 32m', color: '#3b82f6', icon: <Server size={16} /> }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Infrastructure & Surveillance" />
      
      <div style={{ padding: '40px' }}>
        {/* Server Vitals Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '40px' }}>
          {vitals.map((vital, i) => (
            <div key={i} style={{ 
              backgroundColor: colors.bg2, padding: '20px 25px', borderRadius: '24px', border: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', gap: '20px'
            }}>
              <div style={{ backgroundColor: colors.bg3, padding: '12px', borderRadius: '14px', color: vital.color, border: `1px solid ${colors.border}` }}>{vital.icon}</div>
              <div>
                <div style={{ fontSize: '11px', color: colors.muted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{vital.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: 'white', marginTop: '2px' }}>{vital.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Providers Status */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wifi size={22} color={colors.red} /> État des Sources & Providers
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
            {(status || mockProviders).map(provider => (
              <div key={provider.name} style={{ 
                backgroundColor: colors.bg2, padding: '25px', borderRadius: '28px', border: `1px solid ${colors.border}`,
                position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: provider.status === 'online' ? colors.green : colors.red }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: provider.status === 'online' ? colors.green : colors.red, boxShadow: `0 0 10px ${provider.status === 'online' ? colors.green : colors.red}` }} />
                    <span style={{ fontWeight: '900', fontSize: '18px', letterSpacing: '0.5px' }}>{provider.name}</span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: provider.status === 'online' ? colors.green : colors.red, backgroundColor: provider.status === 'online' ? 'rgba(0,200,83,0.1)' : 'rgba(229,9,20,0.1)', padding: '5px 12px', borderRadius: '10px' }}>
                    {provider.status?.toUpperCase() || 'ONLINE'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ backgroundColor: colors.bg3, padding: '15px', borderRadius: '18px', border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: '10px', color: colors.muted, marginBottom: '5px', fontWeight: 'bold' }}>LATENCE</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: colors.gold }}>{provider.latency}</div>
                  </div>
                  <div style={{ backgroundColor: colors.bg3, padding: '15px', borderRadius: '18px', border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: '10px', color: colors.muted, marginBottom: '5px', fontWeight: 'bold' }}>DERNIER CHECK</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{new Date(provider.lastChecked || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
          {/* Popular Content */}
          <div style={{ 
            backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: '28px', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ padding: '25px 30px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Activity size={22} color={colors.gold} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Flux de Visionnage Actif</h3>
              </div>
              <span style={{ fontSize: '11px', color: colors.muted, fontWeight: 'bold', textTransform: 'uppercase' }}>Temps Réel</span>
            </div>
            <div style={{ padding: '10px 0' }}>
              {(popular || mockPopular).map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '18px 30px', 
                  borderBottom: index === (popular || mockPopular).length - 1 ? 'none' : `1px solid rgba(255,255,255,0.02)`,
                  transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ color: colors.muted, fontSize: '14px', fontWeight: 'bold', width: '20px' }}>{index + 1}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: colors.muted }}>{item.mediaType || 'Movie'} • {item.quality || '4K HDR'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.gold, fontWeight: '900', fontSize: '15px' }}>
                      <Play size={16} fill={colors.gold} /> {item.count}
                    </div>
                    <div style={{ width: '60px', height: '4px', backgroundColor: colors.bg3, borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (item.count / 100) * 100)}%`, height: '100%', backgroundColor: colors.gold }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure Control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ 
              backgroundColor: colors.bg2, padding: '30px', borderRadius: '28px', border: `1px solid ${colors.border}`,
              background: `linear-gradient(135deg, ${colors.bg2} 0%, rgba(229, 9, 20, 0.05) 100%)`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Database size={22} color={colors.red} />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Gestion du Cache</h3>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <CacheStat label="URLs EN CACHE" value="42,502" />
                  <CacheStat label="HIT RATE" value="98.2%" color={colors.green} />
                </div>
                
                <div style={{ padding: '20px', backgroundColor: 'rgba(229,9,20,0.05)', borderRadius: '18px', border: `1px solid ${colors.red}20` }}>
                  <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: colors.muted, lineHeight: '1.5' }}>
                    Le cache optimise les performances de streaming en stockant les métadonnées et les flux Torrentio.
                  </p>
                  <button 
                    onClick={() => clearCacheMutation.mutate()}
                    style={{ 
                      width: '100%', backgroundColor: colors.red, color: 'white', border: 'none', 
                      padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      boxShadow: '0 5px 15px rgba(229, 9, 20, 0.3)', transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    <Trash2 size={18} /> Vider le cache système
                  </button>
                </div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: colors.bg2, padding: '30px', borderRadius: '28px', border: `1px solid ${colors.border}`, flex: 1,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'
            }}>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Zap size={50} color={colors.gold} style={{ filter: `drop-shadow(0 0 15px ${colors.gold}50)` }} />
                <div className="animate-ping" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.gold, borderRadius: '50%', opacity: 0.1 }} />
              </div>
              <div style={{ fontSize: '42px', fontWeight: '900', color: 'white' }}>158</div>
              <div style={{ fontSize: '13px', color: colors.muted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>Sessions Actives</div>
              <div style={{ width: '100%', height: '4px', backgroundColor: colors.bg3, borderRadius: '10px', marginTop: '25px', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', backgroundColor: colors.gold, boxShadow: `0 0 10px ${colors.gold}` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CacheStat = ({ label, value, color }) => (
  <div style={{ backgroundColor: colors.bg3, padding: '18px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
    <div style={{ fontSize: '10px', color: colors.muted, marginBottom: '5px', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: '900', color: color || 'white' }}>{value}</div>
  </div>
);

const mockProviders = [
  { name: 'Torrentio', status: 'online', latency: '124ms', lastChecked: new Date() },
  { name: 'Real-Debrid', status: 'online', latency: '45ms', lastChecked: new Date() },
  { name: 'TMDB API', status: 'online', latency: '210ms', lastChecked: new Date() },
];

const mockPopular = [
  { title: 'The Batman', count: 425, mediaType: 'Movie', quality: '4K HDR' },
  { title: 'Oppenheimer', count: 312, mediaType: 'Movie', quality: '1080p' },
  { title: 'Dune: Part Two', count: 258, mediaType: 'Movie', quality: '4K' },
  { title: 'Succession', count: 189, mediaType: 'Series', quality: 'HD' },
  { title: 'Demon Slayer', count: 145, mediaType: 'Anime', quality: 'HD' },
];

export default Streams;
