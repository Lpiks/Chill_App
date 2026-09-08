import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/api';
import Header from '../components/Header';
import { colors } from '../constants/colors';
import { CheckCircle, Trash2, ShieldAlert, ChevronDown, ChevronUp, AlertTriangle, User, FileText, Clock, Check, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expandedRow, setExpandedRow] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminReports', statusFilter],
    queryFn: () => adminService.getReports({ status: statusFilter }).then(res => res.data)
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }) => adminService.resolveReport(id, action),
    onSuccess: () => {
      toast.success("Signalement traité avec succès");
      queryClient.invalidateQueries(['adminReports']);
      queryClient.invalidateQueries(['adminStats']);
    }
  });

  const tabs = [
    { id: 'pending', label: 'En attente', icon: <Clock size={16} /> },
    { id: 'resolved', label: 'Traités', icon: <Check size={16} /> },
    { id: 'all', label: 'Historique complet' }
  ];

  const getReasonColor = (reason) => {
    const r = reason.toLowerCase();
    if (r.includes('spam') || r.includes('harcèlement')) return '#f97316';
    if (r.includes('haine') || r.includes('violence') || r.includes('sexuel')) return colors.red;
    return colors.gold;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <Header title="Gestion des Signalements" />
      
      <div style={{ padding: '40px' }}>
        {/* Modern Tabs Bar */}
        <div style={{ 
          backgroundColor: colors.bg2, 
          padding: '8px', 
          borderRadius: '16px', 
          border: `1px solid ${colors.border}`,
          marginBottom: '30px',
          display: 'flex',
          gap: '10px',
          width: 'fit-content'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setExpandedRow(null); }}
              style={{
                padding: '12px 25px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: statusFilter === tab.id ? colors.red : 'transparent',
                color: statusFilter === tab.id ? 'white' : colors.muted,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                boxShadow: statusFilter === tab.id ? '0 5px 15px rgba(229, 9, 20, 0.3)' : 'none'
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'pending' && data?.filter(r => r.status === 'pending').length > 0 && (
                <span style={{ backgroundColor: 'white', color: colors.red, padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                  {data.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports Table Container */}
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
                <th style={{ padding: '20px 25px' }}>Rapporteur</th>
                <th style={{ padding: '20px 25px' }}>Type de Cible</th>
                <th style={{ padding: '20px 25px' }}>Raison du Signalement</th>
                <th style={{ padding: '20px 25px' }}>Date</th>
                <th style={{ padding: '20px 25px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}><RefreshCw className="animate-spin" color={colors.red} size={30} /></td></tr>
              ) : data?.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center', color: colors.muted }}>Aucun signalement en attente. Félicitations !</td></tr>
              ) : data?.map((report) => (
                <React.Fragment key={report._id}>
                  <tr 
                    style={{ 
                      borderTop: `1px solid ${colors.border}`, 
                      transition: 'all 0.2s',
                      backgroundColor: expandedRow === report._id ? 'rgba(255,255,255,0.02)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '20px 25px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: colors.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.border}`, color: colors.muted }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{report.reporterId?.name || 'Anonyme'}</div>
                          <div style={{ fontSize: '11px', color: colors.muted }}>{report.reporterId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 25px' }}>
                      <span style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 'bold',
                        color: report.targetType === 'user' ? '#3b82f6' : '#a855f7',
                        backgroundColor: report.targetType === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                        padding: '6px 12px', borderRadius: '10px', width: 'fit-content'
                      }}>
                        {report.targetType === 'user' ? <User size={14} /> : <FileText size={14} />}
                        {report.targetType === 'user' ? 'Utilisateur' : 'Publication'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 25px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: getReasonColor(report.reason), fontWeight: 'bold', fontSize: '14px' }}>
                        <AlertTriangle size={16} />
                        {report.reason}
                      </div>
                    </td>
                    <td style={{ padding: '20px 25px', color: colors.muted, fontSize: '13px' }}>
                      {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setExpandedRow(expandedRow === report._id ? null : report._id)}
                          style={{ 
                            width: '38px', height: '38px', borderRadius: '10px', backgroundColor: colors.bg3, border: `1px solid ${colors.border}`,
                            color: colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
                          }}
                        >
                          {expandedRow === report._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        
                        {report.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px', borderLeft: `1px solid ${colors.border}`, paddingLeft: '8px', marginLeft: '5px' }}>
                            <ReportAction icon={<CheckCircle size={18} />} label="Ignorer" color={colors.green} onClick={() => resolveMutation.mutate({ id: report._id, action: 'dismiss' })} />
                            <ReportAction icon={<Trash2 size={18} />} label="Supprimer" color={colors.red} onClick={() => resolveMutation.mutate({ id: report._id, action: 'delete' })} />
                            <ReportAction icon={<ShieldAlert size={18} />} label="Bannir" color={colors.red} onClick={() => resolveMutation.mutate({ id: report._id, action: 'ban' })} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Detail View */}
                  {expandedRow === report._id && (
                    <tr>
                      <td colSpan="5" style={{ padding: '0 25px 25px 25px' }}>
                        <div style={{ 
                          padding: '30px', backgroundColor: colors.bg3, borderRadius: '0 0 18px 18px', 
                          border: `1px solid ${colors.border}`, borderTop: 'none',
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'
                        }}>
                          <div style={{ borderRight: `1px solid ${colors.border}`, paddingRight: '30px' }}>
                            <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Détails de l'incident</div>
                            <div style={{ color: 'white', lineHeight: '1.6', fontSize: '14px' }}>
                              <p style={{ margin: 0 }}><strong>Description :</strong> {report.reason}</p>
                              <p style={{ marginTop: '10px', color: colors.muted }}>Le rapporteur a signalé cette cible pour violation des conditions d'utilisation de la plateforme Cinedz.</p>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Aperçu du contenu cible</div>
                            {report.targetContent ? (
                              <div style={{ backgroundColor: colors.bg2, padding: '15px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                {report.targetType === 'post' ? (
                                  <>
                                    <div style={{ fontWeight: 'bold', color: colors.red, fontSize: '15px' }}>{report.targetContent.title}</div>
                                    <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'white' }}>"{report.targetContent.review}"</div>
                                    <div style={{ fontSize: '12px', color: colors.muted, marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Auteur: {report.targetContent.userId?.name}</span>
                                      <span>❤️ {report.targetContent.likesCount}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colors.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: colors.red }}>{report.targetContent.name?.charAt(0)}</div>
                                      <div>
                                        <div style={{ fontWeight: 'bold' }}>{report.targetContent.name}</div>
                                        <div style={{ fontSize: '12px', color: colors.muted }}>{report.targetContent.email}</div>
                                      </div>
                                    </div>
                                    <div style={{ marginTop: '15px', fontSize: '12px', display: 'flex', gap: '10px' }}>
                                      <span style={{ color: colors.muted }}>Status: {report.targetContent.status}</span>
                                      <span style={{ color: colors.muted }}>Plan: {report.targetContent.subscriptionTier}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div style={{ padding: '20px', textAlign: 'center', backgroundColor: colors.bg2, borderRadius: '12px', border: `1px dashed ${colors.border}`, color: colors.muted, fontSize: '13px' }}>
                                Contenu indisponible ou déjà modéré.
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReportAction = ({ icon, label, color, onClick }) => (
  <button 
    onClick={onClick} 
    title={label}
    style={{ 
      width: '38px', height: '38px', borderRadius: '10px', 
      backgroundColor: 'transparent', border: `1px solid ${color}30`,
      color: color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.3s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = `${color}20`;
      e.currentTarget.style.transform = 'scale(1.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.transform = 'scale(1)';
    }}
  >
    {icon}
  </button>
);

export default Reports;
