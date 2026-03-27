import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  skills: { id: string, name: string }[];
  activeSkillId: string;
  setActiveSkillId: (id: string) => void;
  setIsDriveAuthOpen: (open: boolean) => void;
  selectedFoldersCount: number;
  knowledgeSources: { id: string, name: string, status: string }[];
  setIsAddSourceModalOpen: (open: boolean) => void;
  handleCreateSkillFromSource: (id: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
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
    <div className="chat-layout">
      <Sidebar 
        skills={skills}
        activeSkillId={activeSkillId} 
        setActiveSkillId={setActiveSkillId}
        setIsDriveAuthOpen={setIsDriveAuthOpen}
        selectedFoldersCount={selectedFoldersCount}
        knowledgeSources={knowledgeSources}
        setIsAddSourceModalOpen={setIsAddSourceModalOpen}
        handleCreateSkillFromSource={handleCreateSkillFromSource}
      />
      {children}
    </div>
  );
};

export default Layout;
