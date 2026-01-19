'use client';

import { useState, useEffect } from 'react';

interface VaultFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modifiedAt: Date;
  createdBy?: string;
  extension?: string;
  parentId?: string;
  path: string;
  preview?: string;
}

interface FileVaultViewProps {
  teamId?: string;
}

export default function FileVaultView({ teamId }: FileVaultViewProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('/');
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Load demo files
  useEffect(() => {
    const demoFiles: VaultFile[] = [
      // Root folders
      {
        id: 'f1',
        name: 'Workflow Outputs',
        type: 'folder',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 30),
        path: '/Workflow Outputs',
      },
      {
        id: 'f2',
        name: 'Brand Assets',
        type: 'folder',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        path: '/Brand Assets',
      },
      {
        id: 'f3',
        name: 'Documents',
        type: 'folder',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        path: '/Documents',
      },
      {
        id: 'f4',
        name: 'Media',
        type: 'folder',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        path: '/Media',
      },

      // Files in Workflow Outputs
      {
        id: 'file1',
        name: 'Brand Identity Assembly - Final',
        type: 'file',
        extension: 'pdf',
        size: '2.4 MB',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 15),
        createdBy: 'Sage Chen',
        parentId: 'f1',
        path: '/Workflow Outputs/Brand Identity Assembly - Final.pdf',
        preview: 'Complete brand identity package including color palette, typography, and messaging guidelines.',
      },
      {
        id: 'file2',
        name: 'Market Analysis Report',
        type: 'file',
        extension: 'pdf',
        size: '1.8 MB',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 45),
        createdBy: 'Atlas Rivera',
        parentId: 'f1',
        path: '/Workflow Outputs/Market Analysis Report.pdf',
        preview: 'Comprehensive market analysis covering competitor landscape and positioning opportunities.',
      },
      {
        id: 'file3',
        name: 'Color Strategy Document',
        type: 'file',
        extension: 'pdf',
        size: '892 KB',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60),
        createdBy: 'Aurora Blake',
        parentId: 'f1',
        path: '/Workflow Outputs/Color Strategy Document.pdf',
        preview: 'Authority-focused color palette with psychological justifications and usage guidelines.',
      },

      // Files in Brand Assets
      {
        id: 'file4',
        name: 'Logo Suite',
        type: 'file',
        extension: 'ai',
        size: '5.2 MB',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
        createdBy: 'Design Team',
        parentId: 'f2',
        path: '/Brand Assets/Logo Suite.ai',
      },
      {
        id: 'file5',
        name: 'Brand Guidelines',
        type: 'file',
        extension: 'pdf',
        size: '3.1 MB',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        createdBy: 'Sage Chen',
        parentId: 'f2',
        path: '/Brand Assets/Brand Guidelines.pdf',
      },

      // Files in Documents
      {
        id: 'file6',
        name: 'Project Brief',
        type: 'file',
        extension: 'docx',
        size: '124 KB',
        modifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        createdBy: 'You',
        parentId: 'f3',
        path: '/Documents/Project Brief.docx',
      },
    ];

    setFiles(demoFiles);
  }, []);

  const getCurrentFolderFiles = () => {
    if (currentFolder === '/') {
      return files.filter(f => !f.parentId);
    }
    const currentFolderId = files.find(f => f.path === currentFolder)?.id;
    return files.filter(f => f.parentId === currentFolderId);
  };

  const handleFileClick = (file: VaultFile) => {
    if (file.type === 'folder') {
      setCurrentFolder(file.path);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  const handleBackClick = () => {
    if (currentFolder === '/') return;
    const parentPath = currentFolder.split('/').slice(0, -1).join('/') || '/';
    setCurrentFolder(parentPath);
    setSelectedFile(null);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getFileIcon = (file: VaultFile) => {
    if (file.type === 'folder') {
      return (
        <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    }

    // File type specific icons
    if (file.extension === 'pdf') {
      return (
        <svg className="w-full h-full text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    if (file.extension === 'docx' || file.extension === 'doc') {
      return (
        <svg className="w-full h-full text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (file.extension === 'ai' || file.extension === 'psd' || file.extension === 'fig') {
      return (
        <svg className="w-full h-full text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    // Default file icon
    return (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const filteredFiles = getCurrentFolderFiles().filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbs = currentFolder === '/' ? ['Vault'] : ['Vault', ...currentFolder.split('/').filter(Boolean)];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white mb-1">File Storage</h1>
              <p className="text-sm text-slate-500">Secure storage for all team files</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded-lg transition-all">
                Upload File
              </button>

              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all">
                New Folder
              </button>

              {/* View Toggle */}
              <div className="flex items-center gap-0 bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-white'} transition-all`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-white'} transition-all`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Breadcrumb & Search */}
          <div className="flex items-center gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && (
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <button
                    onClick={() => {
                      if (idx === 0) {
                        setCurrentFolder('/');
                      } else {
                        const path = '/' + breadcrumbs.slice(1, idx + 1).join('/');
                        setCurrentFolder(path);
                      }
                      setSelectedFile(null);
                    }}
                    className={`${idx === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-slate-400 hover:text-white'} transition-colors`}
                  >
                    {crumb}
                  </button>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Browser */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Back Button */}
          {currentFolder !== '/' && (
            <button
              onClick={handleBackClick}
              className="mb-4 px-3 py-1.5 text-slate-400 hover:text-white text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          )}

          {/* Empty State */}
          {filteredFiles.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="text-base font-medium text-white mb-1">No files found</h3>
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'Try a different search term' : 'This folder is empty'}
                </p>
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && filteredFiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`group p-3 rounded-lg border transition-all text-left ${
                    selectedFile?.id === file.id
                      ? 'bg-[#6366F1]/10 border-[#6366F1]'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-12 h-12 mb-2">{getFileIcon(file)}</div>
                  <h3 className="text-xs font-medium text-white mb-1 truncate">
                    {file.name}
                  </h3>
                  {file.type === 'file' && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span>{file.extension?.toUpperCase()}</span>
                      <span>·</span>
                      <span>{file.size}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-600 mt-0.5">{formatTimeAgo(file.modifiedAt)}</div>
                </button>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && filteredFiles.length > 0 && (
            <div className="space-y-px">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`w-full px-4 py-3 transition-all text-left flex items-center gap-3 ${
                    selectedFile?.id === file.id
                      ? 'bg-[#6366F1]/10 text-[#6366F1]'
                      : 'hover:bg-slate-800/50 text-white'
                  }`}
                >
                  <div className="w-8 h-8 flex-shrink-0">{getFileIcon(file)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{file.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {file.type === 'file' && (
                      <>
                        <span className="w-12">{file.extension?.toUpperCase()}</span>
                        <span className="w-16 text-right">{file.size}</span>
                      </>
                    )}
                    <span className="w-20 text-right">{formatTimeAgo(file.modifiedAt)}</span>
                    {file.createdBy && <span className="w-24 text-right truncate">{file.createdBy}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* File Preview Panel */}
        {selectedFile && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10">{getFileIcon(selectedFile)}</div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 text-slate-500 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 className="text-sm font-medium text-white mb-1 break-words">{selectedFile.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{selectedFile.extension?.toUpperCase()}</span>
                {selectedFile.size && (
                  <>
                    <span>·</span>
                    <span>{selectedFile.size}</span>
                  </>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Preview */}
              {selectedFile.preview && (
                <div>
                  <h3 className="text-xs font-medium text-slate-400 mb-2">Preview</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedFile.preview}</p>
                </div>
              )}

              {/* Info */}
              <div>
                <h3 className="text-xs font-medium text-slate-400 mb-2">Details</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-slate-600 mb-0.5">Created By</div>
                    <div className="text-xs text-white">{selectedFile.createdBy || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-0.5">Modified</div>
                    <div className="text-xs text-white">{selectedFile.modifiedAt.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 mb-0.5">Path</div>
                    <div className="text-xs text-slate-400 font-mono break-all">{selectedFile.path}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-xs font-medium text-slate-400 mb-2">Actions</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-xs font-medium rounded-lg transition-all">
                    Download
                  </button>
                  <button className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-all">
                    Share
                  </button>
                  <button className="w-full px-3 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 text-xs font-medium rounded-lg transition-all">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
