'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

interface VaultFile {
  id: number;
  name: string;
  type: 'file' | 'folder';
  file_type?: string;
  size_bytes?: number;
  folder_path: string;
  content?: string;
  content_json?: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
  operation_id?: number;
}

interface FileVaultViewProps {
  teamId?: string;
  initialFileId?: number;
}

export default function FileVaultView({ teamId, initialFileId }: FileVaultViewProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('/');
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch files from API
  const fetchFiles = useCallback(async () => {
    if (!teamId) {
      setIsLoading(false);
      setError('No team selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(
        `${baseUrl}/api/vault/folders?team_id=${teamId}&path=${encodeURIComponent(currentFolder)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const data = await response.json();
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (err) {
      console.error('Error fetching vault files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, currentFolder]);

  // Load initial file if provided
  const loadInitialFile = useCallback(async () => {
    if (!initialFileId || !teamId) return;

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(
        `${baseUrl}/api/vault/files/${initialFileId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const file = await response.json();
        setCurrentFolder(file.folder_path);
        setSelectedFile(file);
      }
    } catch (err) {
      console.error('Error loading initial file:', err);
    }
  }, [initialFileId, teamId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    loadInitialFile();
  }, [loadInitialFile]);

  const handleFileClick = (file: VaultFile) => {
    setSelectedFile(file);
  };

  const handleFolderClick = (folderName: string) => {
    const newPath = currentFolder === '/' ? `/${folderName}` : `${currentFolder}/${folderName}`;
    setCurrentFolder(newPath);
    setSelectedFile(null);
  };

  const handleBackClick = () => {
    if (currentFolder === '/') return;
    const parentPath = currentFolder.split('/').slice(0, -1).join('/') || '/';
    setCurrentFolder(parentPath);
    setSelectedFile(null);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: VaultFile | { type: 'folder' }) => {
    if (file.type === 'folder') {
      return (
        <svg className="w-full h-full text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    }

    const vaultFile = file as VaultFile;
    const ext = vaultFile.file_type?.toLowerCase();

    if (ext === 'pdf') {
      return (
        <svg className="w-full h-full text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    if (ext === 'md' || ext === 'txt') {
      return (
        <svg className="w-full h-full text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (ext === 'json') {
      return (
        <svg className="w-full h-full text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    }

    return (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.toLowerCase().includes(searchQuery.toLowerCase())
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
              <p className="text-sm text-slate-500">Workflow outputs and team documents</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchFiles}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
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
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-slate-500">Loading files...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-base font-medium text-white mb-1">Error loading files</h3>
                <p className="text-sm text-slate-500">{error}</p>
                <button
                  onClick={fetchFiles}
                  className="mt-4 px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-medium rounded-lg transition-all"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredFiles.length === 0 && filteredFolders.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="text-base font-medium text-white mb-1">No files found</h3>
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'Try a different search term' : 'Run a workflow to generate outputs'}
                </p>
              </div>
            </div>
          )}

          {/* Grid View */}
          {!isLoading && !error && viewMode === 'grid' && (filteredFiles.length > 0 || filteredFolders.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {/* Folders */}
              {filteredFolders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => handleFolderClick(folder)}
                  className="group p-3 rounded-lg border bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all text-left"
                >
                  <div className="w-12 h-12 mb-2">{getFileIcon({ type: 'folder' })}</div>
                  <h3 className="text-xs font-medium text-white mb-1 truncate">{folder}</h3>
                  <div className="text-[10px] text-slate-500">Folder</div>
                </button>
              ))}

              {/* Files */}
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
                  <h3 className="text-xs font-medium text-white mb-1 truncate">{file.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>{file.file_type?.toUpperCase()}</span>
                    <span>·</span>
                    <span>{formatFileSize(file.size_bytes)}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{formatTimeAgo(file.created_at)}</div>
                </button>
              ))}
            </div>
          )}

          {/* List View */}
          {!isLoading && !error && viewMode === 'list' && (filteredFiles.length > 0 || filteredFolders.length > 0) && (
            <div className="space-y-px">
              {/* Folders */}
              {filteredFolders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => handleFolderClick(folder)}
                  className="w-full px-4 py-3 hover:bg-slate-800/50 text-white transition-all text-left flex items-center gap-3"
                >
                  <div className="w-8 h-8 flex-shrink-0">{getFileIcon({ type: 'folder' })}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{folder}</h3>
                  </div>
                  <div className="text-xs text-slate-500">Folder</div>
                </button>
              ))}

              {/* Files */}
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
                    <span className="w-12">{file.file_type?.toUpperCase()}</span>
                    <span className="w-16 text-right">{formatFileSize(file.size_bytes)}</span>
                    <span className="w-20 text-right">{formatTimeAgo(file.created_at)}</span>
                    {file.created_by && <span className="w-24 text-right truncate">{file.created_by}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Document Viewer Overlay */}
        {selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col bg-[#0D1117] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

              {/* Top bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0D1117]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0">{getFileIcon(selectedFile)}</div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-white truncate">{selectedFile.name}</h2>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{selectedFile.file_type?.toUpperCase()}</span>
                      <span className="text-slate-700">|</span>
                      <span>{formatFileSize(selectedFile.size_bytes)}</span>
                      <span className="text-slate-700">|</span>
                      <span>{new Date(selectedFile.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {selectedFile.created_by && (
                        <>
                          <span className="text-slate-700">|</span>
                          <span>{selectedFile.created_by}</span>
                        </>
                      )}
                      {selectedFile.operation_id && (
                        <>
                          <span className="text-slate-700">|</span>
                          <span>Op #{selectedFile.operation_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => {
                      if (selectedFile.content) {
                        const blob = new Blob([selectedFile.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = selectedFile.name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Document body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {selectedFile.content ? (
                  <article className="px-10 py-8">
                    {selectedFile.file_type === 'md' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-2xl font-bold text-white mt-0 mb-4 pb-3 border-b border-slate-800">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-semibold text-white mt-8 mb-3 pb-2 border-b border-slate-800/60">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-semibold text-slate-200 mt-6 mb-2">{children}</h3>
                            ),
                            h4: ({ children }) => (
                              <h4 className="text-sm font-semibold text-slate-300 mt-4 mb-1.5">{children}</h4>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm text-slate-300 leading-relaxed mb-4 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-slate-300">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm text-slate-300">{children}</ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed text-slate-300">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">{children}</strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-slate-400">{children}</em>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-2 border-indigo-500/50 pl-4 my-4 text-slate-400 italic">{children}</blockquote>
                            ),
                            code: ({ children, className }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                              ) : (
                                <code className="block bg-slate-950 border border-slate-800 p-4 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto my-4">{children}</code>
                              );
                            },
                            a: ({ children, href }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors">{children}</a>
                            ),
                            hr: () => (
                              <hr className="my-6 border-slate-800" />
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4 rounded-lg border border-slate-800">
                                <table className="w-full text-sm">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-slate-800/50">{children}</thead>
                            ),
                            th: ({ children }) => (
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300 border-b border-slate-700">{children}</th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800/50">{children}</td>
                            ),
                          }}
                        >
                          {selectedFile.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{selectedFile.content}</pre>
                    )}
                  </article>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-sm text-slate-600">No content available</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
