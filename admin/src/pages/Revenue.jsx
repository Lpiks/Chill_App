import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, CreditCard, Download, ArrowUpRight, ArrowDownRight, RefreshCw, Wallet } from 'lucide-react';

const Revenue = () => {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['adminRevenueSummary'],
    queryFn: () => adminService.getRevenueSummary().then(res => res.data)
  });

  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['adminTransactions'],
    queryFn: () => adminService.getRevenueTransactions({ page: 1 }).then(res => res.data)
  });

  // Modern Area Chart data
  const chartData = [
    { name: 'Jan', revenue: 45000, users: 400 },
    { name: 'Fév', revenue: 52000, users: 450 },
    { name: 'Mar', revenue: 48000, users: 480 },
    { name: 'Avr', revenue: 61000, users: 550 },
    { name: 'Mai', revenue: 55000, users: 590 },
    { name: 'Juin', revenue: 67000, users: 650 },
    { name: 'Juil', revenue: 72000, users: 720 },
    { name: 'Août', revenue: 85000, users: 800 },
    { name: 'Sep', revenue: 92000, users: 890 },
    { name: 'Oct', revenue: 105000, users: 950 },
    { name: 'Nov', revenue: 110000, users: 1100 },
    { name: 'Déc', revenue: 125000, users: 1240 },
  ];

  const formatCurrency = (val) => `${val?.toLocaleString() || 0} DZD`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Analyse Financière" />
      
      <div style={{ padding: '40px' }}>
        {/* Top Summary Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
          <PremiumStatCard 
            title="Revenus Mensuels" 
            value={formatCurrency(summary?.thisMonth || 125000)} 
            icon={<DollarSign size={22} />} 
            trend="+18.5%" 
            color={colors.red}
          />
          <PremiumStatCard 
            title="Total à Vie" 
            value={formatCurrency(summary?.totalAllTime || 1450000)} 
            icon={<Wallet size={22} />} 
            trend="+5.2%" 
            color={colors.gold}
          />
          <PremiumStatCard 
            title="Abonnés Actifs" 
            value="1,240" 
            icon={<Users size={22} />} 
            trend="+12%" 
            color="#3b82f6"
          />
          <PremiumStatCard 
            title="ARPU (Moyen/User)" 
            value="850 DZD" 
            icon={<CreditCard size={22} />} 
            trend="-2%" 
            color="#a855f7"
            isNegative
          />
        </div>

        {/* Main Analytics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '30px', marginBottom: '40px' }}>
          <div style={{ 
            backgroundColor: colors.bg2, 
            padding: '30px', 
            borderRadius: '28px', 
            border: `1px solid ${colors.border}`,
            boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Évolution de la Croissance</h3>
                <p style={{ margin: '5px 0 0 0', color: colors.muted, fontSize: '13px' }}>Comparaison des revenus et nouveaux abonnés sur 12 mois</p>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <LegendItem color={colors.red} label="Revenus" />
                <LegendItem color="#3b82f6" label="Utilisateurs" />
              </div>
            </div>
            
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.red} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.red} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke={colors.muted} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke={colors.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111118', border: `1px solid ${colors.border}`, borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={colors.red} strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <CircularProgressCard title="Rétention Client" value="84" color={colors.green} subtitle="Excellent" />
            <CircularProgressCard title="Taux de Churn" value="12" color={colors.red} subtitle="Stable" isWarning />
            <div style={{ 
              backgroundColor: colors.bg2, padding: '25px', borderRadius: '24px', border: `1px solid ${colors.border}`, flex: 1,
              background: `linear-gradient(135deg, ${colors.bg2} 0%, rgba(229, 9, 20, 0.05) 100%)`
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: colors.muted }}>Objectif Annuel</h4>
              <div style={{ fontSize: '24px', fontWeight: '900' }}>78%</div>
              <div style={{ height: '6px', backgroundColor: colors.bg3, borderRadius: '10px', marginTop: '15px', overflow: 'hidden' }}>
                <div style={{ width: '78%', height: '100%', backgroundColor: colors.red, boxShadow: `0 0 10px ${colors.red}` }} />
              </div>
              <p style={{ fontSize: '11px', color: colors.muted, marginTop: '10px' }}>En avance de 4% sur les prévisions.</p>
            </div>
          </div>
        </div>

        {/* High-Fidelity Transactions Table */}
        <div style={{ 
          backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: '28px', overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{ padding: '25px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Flux de Transactions</h3>
              <p style={{ margin: '3px 0 0 0', color: colors.muted, fontSize: '12px' }}>Derniers paiements reçus via Stripe & PayPal</p>
            </div>
            <button style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', 
              backgroundColor: colors.bg3, border: `1px solid ${colors.border}`, color: 'white', 
              borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.3s'
            }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.target.style.backgroundColor = colors.bg3}>
              <Download size={16} /> Exporter les données
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: colors.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <tr>
                <th style={{ padding: '20px 30px' }}>Utilisateur / Client</th>
                <th style={{ padding: '20px 30px' }}>Détails du Plan</th>
                <th style={{ padding: '20px 30px' }}>Montant Net</th>
                <th style={{ padding: '20px 30px' }}>Date d'opération</th>
                <th style={{ padding: '20px 30px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingTransactions ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}><RefreshCw className="animate-spin" color={colors.red} size={30} /></td></tr>
              ) : (transactionsData?.transactions || mockTransactions).map((tx) => (
                <tr 
                  key={tx.id} 
                  style={{ borderTop: `1px solid ${colors.border}`, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '20px 30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: colors.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: 'bold', color: colors.red }}>
                        {tx.user?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{tx.user}</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 30px' }}>
                    <span style={{ fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                      {tx.plan}
                    </span>
                  </td>
                  <td style={{ padding: '20px 30px', fontWeight: '800', color: 'white' }}>{tx.amount} DZD</td>
                  <td style={{ padding: '20px 30px', color: colors.muted, fontSize: '14px' }}>
                    {new Date(tx.date || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                  </td>
                  <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                    <span style={{ 
                      color: colors.green, fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: 'rgba(0, 200, 83, 0.1)', padding: '6px 12px', borderRadius: '10px',
                      border: `1px solid ${colors.green}30`
                    }}>
                      Confirmé
                    </span>
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

const PremiumStatCard = ({ title, value, icon, trend, color, isNegative }) => (
  <div style={{ 
    backgroundColor: colors.bg2, padding: '25px', borderRadius: '24px', border: `1px solid ${colors.border}`, 
    position: 'relative', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
  }}>
    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', backgroundColor: color, opacity: 0.05, borderRadius: '50%' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
      <div style={{ backgroundColor: colors.bg3, padding: '12px', borderRadius: '14px', color: color, border: `1px solid ${colors.border}` }}>
        {icon}
      </div>
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 'bold',
        color: isNegative ? colors.red : colors.green,
        backgroundColor: isNegative ? 'rgba(229,9,20,0.1)' : 'rgba(0,200,83,0.1)',
        padding: '4px 8px', borderRadius: '8px'
      }}>
        {isNegative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
        {trend}
      </div>
    </div>
    <div style={{ fontSize: '13px', color: colors.muted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
    <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '5px' }}>{value}</div>
  </div>
);

const CircularProgressCard = ({ title, value, color, subtitle, isWarning }) => (
  <div style={{ backgroundColor: colors.bg2, padding: '25px', borderRadius: '24px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '20px' }}>
    <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
        <circle cx="30" cy="30" r="26" fill="none" stroke={colors.bg3} strokeWidth="6" />
        <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="6" strokeDasharray="163.3" strokeDashoffset={163.3 - (163.3 * value) / 100} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', fontSize: '14px', fontWeight: '900', color: 'white' }}>{value}%</span>
    </div>
    <div>
      <div style={{ fontSize: '13px', color: colors.muted, fontWeight: 'bold' }}>{title}</div>
      <div style={{ fontSize: '16px', fontWeight: '800', color: color, marginTop: '2px' }}>{subtitle}</div>
    </div>
  </div>
);

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color }} />
    <span style={{ fontSize: '12px', color: colors.muted, fontWeight: 'bold' }}>{label}</span>
  </div>
);

const mockTransactions = [
  { id: 1, user: 'Elhadi Admin', plan: 'Premium Yearly', amount: 14000, date: '2026-05-01' },
  { id: 2, user: 'Lpiks', plan: 'Standard Monthly', amount: 900, date: '2026-04-30' },
  { id: 3, user: 'John Doe', plan: 'Basic Monthly', amount: 500, date: '2026-04-28' },
  { id: 4, user: 'Sarah Kerrigan', plan: 'Premium Monthly', amount: 1500, date: '2026-04-25' },
];

export default Revenue;
