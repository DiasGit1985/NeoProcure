import React from 'react';

interface SidebarProps {
  skills: { id: string, name: string, sources: string[] }[];
  activeSkillId: string;
  setActiveSkillId: (id: string) => void;
  setIsDriveAuthOpen: (open: boolean) => void;
  selectedFoldersCount: number;
  knowledgeSources: { id: string, name: string, status: string }[];
  setIsAddSourceModalOpen: (open: boolean) => void;
  handleCreateSkillFromSource: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  skills,
  activeSkillId, 
  setActiveSkillId, 
  setIsDriveAuthOpen,
  selectedFoldersCount,
  knowledgeSources,
  setIsAddSourceModalOpen,
  handleCreateSkillFromSource
}) => {
  return (
    <nav className="chat-sidebar">
      <div className="sidebar-content">
        {/* Top Navigation */}
        <div className="nav-item">
          <div className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <span>Novo chat</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <span>Buscar em chats</span>
        </div>

        {/* Global IA Actions (Estilo ChatGPT) */}
        <div className="nav-item">
          <div className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </div>
          <span>Imagens</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
          </div>
          <span>Galeria</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line></svg>
          </div>
          <span>Aplicativos</span>
        </div>

        {/* Section: Projetos (Mapeado para Fontes de Dados) */}
        <div className="sidebar-section-title">Fontes de Conhecimento</div>
        
        <div className="knowledge-sources-list">
          {knowledgeSources.map(source => (
            <div 
              key={source.id} 
              className="project-item"
              onClick={() => handleCreateSkillFromSource(source.id)}
              title="Criar nova skill com esta fonte"
            >
              <div className="nav-icon">
                <div className={`status-dot ${source.status}`}></div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <span className="truncate">{source.name}</span>
            </div>
          ))}
          
          <div className="project-item add-source-btn" onClick={() => setIsAddSourceModalOpen(true)}>
            <div className="nav-icon highlight">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <span className="text-highlight">Adicionar Link Drive</span>
          </div>
        </div>

        <div className="sidebar-section-title">Integrações</div>
        <div className="project-item" onClick={() => setIsDriveAuthOpen(true)}>
          <div className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span>Google Drive {selectedFoldersCount > 0 && `(${selectedFoldersCount})`}</span>
        </div>
        <div className="project-item">
          <div className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span>Notion</span>
        </div>

        {/* Section: Seus chats (Skills Ativas e Histórico) */}
        <div className="sidebar-section-title">Seus chats</div>
        <div className="skill-list" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {skills.map((skill) => (
            <div 
              key={skill.id}
              className={`chat-item ${activeSkillId === skill.id ? 'active' : ''}`}
              onClick={() => setActiveSkillId(skill.id)}
              style={{ backgroundColor: activeSkillId === skill.id ? '#212121' : 'transparent', position: 'relative' }}
            >
              <span className="truncate" style={{ flex: 1 }}>{skill.name}</span>
              {activeSkillId === skill.id && (
                <div className="active-dot glow-effect" title="Skill Ativa"></div>
              )}
            </div>
          ))}
        </div>

        {/* New Section: Skill Intelligence / Context */}
        <div className="sidebar-section-title">Inteligência da Skill</div>
        <div className="skill-config-card glass-panel">
          <p style={{ fontSize: '0.75rem', color: '#9b9b9b', marginBottom: '8px' }}>
            Contexto: {skills.find(s => s.id === activeSkillId)?.sources.length || 0} fonte(s) conectada(s)
          </p>
          <button 
            className="btn-secondary btn-sm" 
            style={{ width: '100%', fontSize: '0.7rem' }}
            onClick={() => setIsAddSourceModalOpen(true)}
          >
            Treinar com nova fonte
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="user-profile-bottom">
        <div className="user-item">
          <div className="avatar-chatgpt">ED</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Efigenio Dias</span>
            <span style={{ fontSize: '0.7rem', color: '#9b9b9b' }}>Plus</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
