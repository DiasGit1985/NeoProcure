import { useState, useRef, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import './index.css';
import './App.css';
import Layout from './components/Layout';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Skill {
  id: string;
  name: string;
  sources: string[]; // IDs das pastas ou links
}

interface KnowledgeSource {
  id: string;
  name: string;
  link: string;
  status: 'syncing' | 'ready' | 'error';
  fileCount: number;
  lastSync: string;
}

const GOOGLE_CLIENT_ID = "811466367845-ooi3ehr18d098v1c9rbka2lc6thi0hk6.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <NeoProcureApp />
    </GoogleOAuthProvider>
  );
}

function NeoProcureApp() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [realFolders, setRealFolders] = useState<{id: string, name: string}[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login Success:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
      setIsDriveAuthOpen(false);
      setIsDriveModalOpen(true);
      fetchDriveFolders(tokenResponse.access_token);
    },
    onError: () => console.log('Login Failed'),
    scope: 'https://www.googleapis.com/auth/drive.readonly',
  });

  const fetchDriveFolders = async (token: string) => {
    setIsLoadingFolders(true);
    console.log("Iniciando busca no Drive com token:", token.substring(0, 10) + "...");
    try {
      // Query mais abrangente: busca pastas não excluídas, incluindo as compartilhadas
      const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, owners)&pageSize=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log("Resposta bruta da API do Drive:", data);
      
      if (data.error) {
        console.error("Erro retornado pela API:", data.error);
        alert(`Erro do Google: ${data.error.message}`);
      }

      if (data.files) {
        setRealFolders(data.files);
        console.log(`${data.files.length} pastas encontradas.`);
      } else {
        setRealFolders([]);
      }
    } catch (error) {
      console.error("Erro crítico ao buscar pastas do Drive:", error);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const [skills, setSkills] = useState<Skill[]>([
    { id: '1', name: 'Análise de Compras', sources: [] },
    { id: '2', name: 'Auditoria de NFs', sources: [] },
    { id: '3', name: 'Avaliação de Cotação', sources: ['ks-hist'] },
    { id: '4', name: 'Visão Geral do Mercado', sources: [] }
  ]);
  const [activeSkillId, setActiveSkillId] = useState('1');
  const activeSkill = skills.find(s => s.id === activeSkillId)?.name || 'Nova Skill';
  
  const [inputValue, setInputValue] = useState('');
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDriveAuthOpen, setIsDriveAuthOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([
    { 
      id: 'ks1', 
      name: 'Base de Contratos GERAL', 
      link: 'https://drive.google.com/drive/folders/1abc...', 
      status: 'ready', 
      fileCount: 156,
      lastSync: 'Hoje, 10:30'
    },
    { 
      id: 'ks-hist', 
      name: 'Histórico de Preços (Drive)', 
      link: 'https://drive.google.com/drive/folders/hist-link', 
      status: 'ready', 
      fileCount: 24,
      lastSync: 'Ontem, 16:45'
    }
  ]);

  const driveFolders = [
    { id: 'f1', name: 'Contratos 2025 - 2026', items: 142 },
    { id: 'f2', name: 'Planilhas de Cotação (Q1)', items: 12 },
    { id: 'f3', name: 'Histórico de Fornecedores (Base)', items: 3 },
    { id: 'f4', name: 'Notas Fiscais - Auditoria', items: 856 }
  ];

  const handleToggleFolder = (id: string) => {
    setSelectedFolders(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleCreateSkillFromSelection = () => {
    if (selectedFolders.length === 0) return;
    
    // Pegar nomes das pastas selecionadas para sugerir um nome
    const folderNames = driveFolders
      .filter(f => selectedFolders.includes(f.id))
      .map(f => f.name.split(' - ')[0]) // Tira o ano para encurtar
      .join(' & ');
    
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: `Estudo: ${folderNames}`,
      sources: [...selectedFolders]
    };
    
    setSkills(prev => [...prev, newSkill]);
    setActiveSkillId(newSkill.id);
    setIsDriveModalOpen(false);
    setSelectedFolders([]); // Limpa para a próxima
    
    // Adicionar mensagem de boas-vindas da IA para a nova skill
    const welcomeMsg: Message = {
      id: (Date.now() + 5).toString(),
      role: 'assistant',
      content: `Nova skill "${newSkill.name}" criada com sucesso! Já processei os dados das pastas conectadas. Como posso ajudar com este novo contexto?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, welcomeMsg]);
  };

  const handleCreateSkillFromSource = (sourceId: string) => {
    const source = knowledgeSources.find(s => s.id === sourceId);
    if (!source) return;

    const newSkill: Skill = {
      id: Date.now().toString(),
      name: `Análise: ${source.name}`,
      sources: [source.id]
    };

    setSkills(prev => [...prev, newSkill]);
    setActiveSkillId(newSkill.id);

    const welcomeMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Criada nova skill focada em **${source.name}**. Estou pronto para analisar os ${source.fileCount} arquivos desta pasta. O que você gostaria de saber?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, welcomeMsg]);
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu assistente NeoProcure. Como posso otimizar seu processo de compras hoje? Você pode fazer upload de planilhas de cotação ou pedir análises de fornecedores específicos.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setIsAttachMenuOpen(false);
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    // Simular resposta da IA (Apenas visual)
    setTimeout(() => {
      let aiContent = `Certo. Iniciei a análise com a skill "${activeSkill}". Por favor, anexe os documentos necessários para que eu cruze os dados.`;
      
      const lowerInput = inputValue.toLowerCase();
      const needsAnalysis = lowerInput.includes('analis') || lowerInput.includes('oc') || lowerInput.includes('cotaç') || lowerInput.includes('estudo') || lowerInput.includes('preço');
      const needsFolderList = lowerInput.includes('dentro') || lowerInput.includes('arquivos') || lowerInput.includes('conteúdo') || lowerInput.includes('pasta');
      
      const currentSkill = skills.find(s => s.id === activeSkillId);
      
      if (activeSkillId === '3' && needsAnalysis) {
        aiContent = `Analisando a sua solicitação com base no **Histórico de Preços em tempo real...** 📊

Encontrei o item **"Resina Poliéster Industrial"** no seu histórico. Aqui está a comparação:

| Mês/Ano | Fornecedor | Preço (kg) | Variação |
| :--- | :--- | :--- | :--- |
| **Atual (OC)** | **Química Sul** | **R$ 12,40** | **+5.2%** ⚠️ |
| Jan/2026 | Química Sul | R$ 11,80 | - |
| Dez/2025 | Master Polímeros | R$ 11,75 | - |
| Nov/2025 | Química Sul | R$ 11,90 | - |

**Análise:** O preço atual está **5.2% acima** da média do último trimestre. O fornecedor Master Polímeros ofereceu o melhor preço histórico (R$ 11,75). 

Deseja que eu gere um gráfico de evolução ou que eu sugira uma contraproposta para o comprador?`;
      } else if (needsFolderList && currentSkill && currentSkill.sources && currentSkill.sources.length > 0) {
        // Encontrar os nomes das fontes vinculadas
        const linkedSources = knowledgeSources.filter(ks => currentSkill.sources.includes(ks.id));
        
        if (linkedSources.length > 0) {
          aiContent = `Analisando as fontes de conhecimento da skill **${activeSkill}**...\n\n`;
          linkedSources.forEach(source => {
            aiContent += `📂 **Pasta: ${source.name}**\n`;
            aiContent += `Encontrei **${source.fileCount} arquivos** nesta pasta, incluindo:\n`;
            aiContent += `- \`cotação_fornecedor_A_2024.pdf\`\n`;
            aiContent += `- \`tabela_preços_consolidada.xlsx\`\n`;
            aiContent += `- \`histórico_compras_q4.csv\`\n\n`;
          });
          aiContent += `Qual destes documentos você gostaria que eu analisasse primeiro?`;
        }
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Layout 
      skills={skills}
      activeSkillId={activeSkillId} 
      setActiveSkillId={setActiveSkillId}
      setIsDriveAuthOpen={setIsDriveAuthOpen}
      selectedFoldersCount={selectedFolders.length}
      knowledgeSources={knowledgeSources}
      setIsAddSourceModalOpen={setIsAddSourceModalOpen}
      handleCreateSkillFromSource={handleCreateSkillFromSource}
    >
      {/* Área Principal de Conversação */}
      <main className="chat-main">
        {/* Cabeçalho do Chat */}
        <header className="chat-header glass-panel">
          <div className="chat-title-area">
            <h2>Workflow: <span className="text-gradient font-bold">{activeSkill}</span></h2>
            <p className="model-status">Modelo IA Otimizado Pronto v4.0</p>
          </div>
          <button className="icon-btn-ghost">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </header>

        {/* Histórico de Mensagens */}
        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
              {msg.role === 'assistant' && (
                <div className="message-avatar ai-avatar glow-effect">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                    <path d="M2 17L12 22L22 17"/>
                    <path d="M2 12L12 17L22 12"/>
                  </svg>
                </div>
              )}
              <div className="message-content">
                <div className="message-text">
                  {msg.content}
                </div>
                <span className="message-time">{msg.timestamp}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area (Base) */}
        <div className="input-area-wrapper">
          <form className="chat-input-form glass-panel-heavy" onSubmit={handleSendMessage}>
            
            <div className="attach-menu-container" ref={attachMenuRef}>
              <button 
                type="button" 
                className={`upload-btn ${isAttachMenuOpen ? 'active' : ''}`} 
                title="Anexar Arquivos (Cotações, NFs, Planilhas)"
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              {isAttachMenuOpen && (
                <div className="attach-popover glass-panel-heavy animate-fade-in">
                  <ul className="popover-menu">
                    <li className="popover-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      Adicionar fotos e arquivos
                    </li>
                    <li className="popover-item" onClick={() => {
                        setIsDriveAuthOpen(true);
                        setIsAttachMenuOpen(false);
                      }}>
                      <div className="source-icon drive-icon popover-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div>
                      Adicionar de Google Drive
                    </li>
                    <div className="popover-divider"></div>
                    <div className="popover-label" style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: '#8e8e8e', textTransform: 'uppercase', fontWeight: 600 }}>Suas Fontes Conectadas</div>
                    {knowledgeSources.map(source => (
                      <li key={source.id} className="popover-item" onClick={() => {
                        setInputValue(prev => prev + `[Analisando contexto de: ${source.name}] `);
                        setIsAttachMenuOpen(false);
                      }}>
                        <div className="source-icon drive-icon popover-icon" style={{ backgroundColor: '#4285f4' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        {source.name}
                      </li>
                    ))}
                    <div className="popover-divider"></div>
                    <li className="popover-item has-submenu">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      Arquivos recentes
                      <svg className="submenu-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </li>
                    <div className="popover-divider"></div>
                    <li className="popover-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      Pesquisa aprofundada
                    </li>
                    <li className="popover-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      Busca na web ERP
                    </li>
                    <li 
                      className={`popover-item has-submenu ${isMoreMenuOpen ? 'active' : ''}`}
                      onMouseEnter={() => setIsMoreMenuOpen(true)}
                      onMouseLeave={() => setIsMoreMenuOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                      Mais
                      <svg className="submenu-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      
                      {isMoreMenuOpen && (
                        <div className="attach-sub-popover glass-panel-heavy">
                          <ul className="popover-menu">
                            <li className="popover-item">
                              <div className="source-icon notion-icon popover-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M9 4v16"/><path d="M15 4v16"/></svg></div>
                              Notion
                            </li>
                            <li className="popover-item">
                              <div className="source-icon sheets-icon popover-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></div>
                              Google Sheets
                            </li>
                          </ul>
                        </div>
                      )}
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            <textarea 
              className="chat-textarea" 
              placeholder="Digite suas dúvidas, cole dados ou anexe planilhas para análise da IA..."
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <button type="submit" className={`send-btn ${inputValue.trim() ? 'active' : ''}`} disabled={!inputValue.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <div className="input-footer">
            NeoProcure AI pode cometer erros de modelagem. Verifique métricas essenciais.
          </div>
        </div>
      </main>

      {/* Google Drive Auth Simulation Modal */}
      {isDriveAuthOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsDriveAuthOpen(false)}>
          <div className="auth-modal glass-panel-heavy" onClick={(e) => e.stopPropagation()}>
            <div className="google-logo-area">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.26 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.87 14.13c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.53 1 10.21 1 12s.43 3.47 1.18 4.97l3.69-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335"/>
              </svg>
            </div>
            <h2 className="auth-title">Fazer login com o Google</h2>
            <p className="auth-subtitle">para continuar no <strong>NeoProcure AI</strong></p>
            
            <div className="auth-account-selector">
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', borderRadius: '8px', padding: '12px' }}
                onClick={() => {
                  login();
                }}
              >
                <svg style={{ marginRight: '8px' }} width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                </svg>
                Entrar com Google (Real)
              </button>
            </div>
            
            <div className="auth-footer-text">
              Para continuar, o Google compartilhará seu nome, endereço de e-mail e foto do perfil com o NeoProcure AI.
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Integration Modal */}
      {isDriveModalOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsDriveModalOpen(false)}>
          <div className="drive-modal glass-panel-heavy" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="source-icon drive-icon modal-header-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <h3>Conectar ao Google Drive</h3>
              </div>
              <button className="icon-btn-ghost close-btn" onClick={() => setIsDriveModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">Selecione as pastas e relatórios específicos que a NeoProcure poderá utilizar como contexto (Fontes de Dados) para suas análises e respostas.</p>
              
              <div className="folder-list-container">
                <div className="folder-list-header">
                  <span>Suas Pastas do Drive</span>
                  <span className="folder-count">{selectedFolders.length} selecionadas</span>
                </div>
                
                <ul className="folder-list">
                  {isLoadingFolders ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#a0a0ab' }}>Buscando suas pastas...</div>
                  ) : realFolders.length > 0 ? (
                    realFolders.map((folder) => (
                      <li 
                        key={folder.id} 
                        className={`folder-item ${selectedFolders.includes(folder.id) ? 'selected' : ''}`}
                        onClick={() => handleToggleFolder(folder.id)}
                      >
                        <div className="folder-checkbox">
                          {selectedFolders.includes(folder.id) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </div>
                        <svg className="folder-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        <div className="folder-info">
                          <span className="folder-name">{folder.name}</span>
                          <span className="folder-meta">ID: {folder.id.substring(0, 8)}...</span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#a0a0ab' }}>Nenhuma pasta encontrada.</div>
                  )}
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary btn" onClick={() => setIsDriveModalOpen(false)}>Cancelar</button>
              <button 
                className="btn-primary btn" 
                onClick={handleCreateSkillFromSelection}
                disabled={selectedFolders.length === 0}
              >
                Criar Skill com {selectedFolders.length} fontes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Adicionar Fonte por Link */}
      {isAddSourceModalOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsAddSourceModalOpen(false)}>
          <div className="drive-modal glass-panel-heavy" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="source-icon drive-icon modal-header-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </div>
                <h3>Adicionar Fonte por Link</h3>
              </div>
              <button className="icon-btn-ghost close-btn" onClick={() => setIsAddSourceModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">Cole o link da pasta do Google Drive. O NeoProcure irá escanear o conteúdo para indexar como fonte de conhecimento.</p>
              
              <div className="input-group">
                <label className="input-label">Link da Pasta</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="https://drive.google.com/drive/folders/..." 
                  autoFocus
                />
              </div>

              <div className="status-preview">
                <div className="preview-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div className="preview-info">
                  <span className="preview-title">Aguardando link válido...</span>
                  <span className="preview-subtitle">Pastas públicas ou com acesso liberado</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary btn" onClick={() => setIsAddSourceModalOpen(false)}>Cancelar</button>
              <button 
                className="btn-primary btn" 
                onClick={() => {
                  const newSource: KnowledgeSource = {
                    id: Date.now().toString(),
                    name: 'Nova Fonte de Dados',
                    link: 'https://drive.google.com/...',
                    status: 'syncing',
                    fileCount: 0,
                    lastSync: 'Agora'
                  };
                  setKnowledgeSources(prev => [...prev, newSource]);
                  setIsAddSourceModalOpen(false);
                  
                  // Simular conclusão do processamento
                  setTimeout(() => {
                    setKnowledgeSources(prev => prev.map(s => 
                      s.id === newSource.id ? { ...s, status: 'ready', fileCount: 24, name: 'Pasta de Cotações Março' } : s
                    ));
                  }, 3000);
                }}
              >
                Conectar e Escanear
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Efeitos de Fundo (agora no Layout) */}
    </Layout>
  );
}

export default App;
