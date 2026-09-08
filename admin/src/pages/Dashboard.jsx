import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { 
  Users, 
  DollarSign, 
  Tv, 
  Flag, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const StatCard = ({ title, value, growth, icon, color }) => (
  <div style={{
    backgroundColor: colors.bg2,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '20px',
    flex: 1,
    minWidth: '220px',
    margin: '10px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: colors.muted, margin: '0 0 5px 0', fontSize: '14px' }}>{title}</p>
        <h3 style={{ margin: 0, fontSize: '28px', color: 'white' }}>{value}</h3>
      </div>
      <div style={{ 
        backgroundColor: `${color}15`, 
        padding: '10px', 
        borderRadius: '10px',
        color: color
      }}>
        {icon}
      </div>
    </div>
    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', fontSize: '13px' }}>
      <span style={{ 
        display: 'flex', 
        alignItems: 'center', 
        color: growth >= 0 ? colors.green : colors.red,
        marginRight: '8px'
      }}>
        {growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(growth)}%
      </span>
      <span style={{ color: colors.muted }}>vs dernier mois</span>
    </div>
  </div>
);

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminService.getStats().then(res => res.data)
  });

  const { data: streamStatus, isLoading: streamsLoading } = useQuery({
    queryKey: ['adminStreamStatus'],
    queryFn: () => adminService.getStreamStatus().then(res => res.data)
  });

  // User growth chart data (Mocked as backend doesn't have daily history yet, but ready for it)
  const userData = [
    { name: 'Lun', users: 400 },
    { name: 'Mar', users: 600 },
    { name: 'Mer', users: 500 },
    { name: 'Jeu', users: 800 },
    { name: 'Ven', users: 700 },
    { name: 'Sam', users: 1100 },
    { name: 'Dim', users: stats?.totalUsers || 1250 },
  ];

  const subData = [
    { name: 'Free', value: stats?.subscriptionBreakdown?.free || 0 },
    { name: 'Basic', value: stats?.subscriptionBreakdown?.basic || 0 },
    { name: 'Standard', value: stats?.subscriptionBreakdown?.standard || 0 },
    { name: 'Premium', value: stats?.subscriptionBreakdown?.premium || 0 },
  ];

  const PIE_COLORS = ['#888888', '#3b82f6', '#a855f7', colors.gold];

  if (statsLoading || streamsLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Chargement des données...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Tableau de bord" />
      
      <div style={{ padding: '20px' }}>
        {/* Stats Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-10px' }}>
          <StatCard 
            title="Utilisateurs Totaux" 
            value={stats?.totalUsers || 0} 
            growth={12} 
            icon={<Users size={24} />} 
            color="#3b82f6" 
          />
          <StatCard 
            title="Revenus du mois" 
            value={`${stats?.revenueThisMonth?.toLocaleString() || 0} DZD`} 
            growth={8} 
            icon={<DollarSign size={24} />} 
            color={colors.green} 
          />
          <StatCard 
            title="Streams Actifs" 
            value={stats?.activeStreams || 0} 
            growth={25} 
            icon={<Tv size={24} />} 
            color={colors.red} 
          />
          <StatCard 
            title="Signalements" 
            value={stats?.pendingReports || 0} 
            growth={-5} 
            icon={<Flag size={24} />} 
            color={colors.gold} 
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '20px', gap: '20px' }}>
          <div style={{ 
            flex: 2, 
            backgroundColor: colors.bg2, 
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '25px',
            minWidth: '500px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '18px' }}>Croissance des Utilisateurs</h4>
              <div style={{ fontSize: '12px', color: colors.muted }}>7 derniers jours</div>
            </div>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke={colors.muted} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={colors.muted} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: '8px' }}
                    itemStyle={{ color: colors.red }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke={colors.red} 
                    strokeWidth={4} 
                    dot={{ r: 0 }} 
                    activeDot={{ r: 6, fill: colors.red, stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ 
            flex: 1, 
            backgroundColor: colors.bg2, 
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '25px',
            minWidth: '320px'
          }}>
            <h4 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Abonnements</h4>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subData}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {subData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '20px' }}>
              {subData.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[i], marginRight: '10px' }} />
                    <span style={{ color: colors.muted }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 'bold' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div style={{ marginTop: '20px', backgroundColor: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Activity size={20} color={colors.red} />
            <h4 style={{ margin: 0, fontSize: '18px' }}>État du réseau de streaming</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            {streamStatus?.map(provider => (
              <div key={provider.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg3, padding: '15px 20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: provider.status === 'online' ? colors.green : colors.red, 
                    marginRight: '12px',
                    boxShadow: provider.status === 'online' ? `0 0 10px ${colors.green}` : `0 0 10px ${colors.red}`
                  }} />
                  <span style={{ fontWeight: 600 }}>{provider.name}</span>
                </div>
                <span style={{ color: colors.muted, fontSize: '12px' }}>{provider.latency}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
