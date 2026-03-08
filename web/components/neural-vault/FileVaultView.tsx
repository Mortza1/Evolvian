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

  // ── Icon colours keyed by file type ──────────────────────────────────────
  const FILE_COLORS: Record<string, string> = {
    folder: '#BF8A52',
    pdf:    '#9E5A5A',
    md:     '#5A9E8F',
    txt:    '#5A9E8F',
    json:   '#7A9EA6',
    default:'#4A6A72',
  };

  const getFileColor = (file: VaultFile | { type: 'folder' }) => {
    if (file.type === 'folder') return FILE_COLORS.folder;
    const ext = (file as VaultFile).file_type?.toLowerCase() ?? 'default';
    return FILE_COLORS[ext] ?? FILE_COLORS.default;
  };

  const getFileIcon = (file: VaultFile | { type: 'folder' }) => {
    const color = getFileColor(file);

    if (file.type === 'folder') {
      return (
        <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    }

    const vaultFile = file as VaultFile;
    const ext = vaultFile.file_type?.toLowerCase();

    if (ext === 'json') {
      return (
        <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    }

    return (
      <svg width="100%" height="100%" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getTypeLabel = (file: VaultFile) => file.file_type?.toUpperCase() ?? '—';

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const breadcrumbs = currentFolder === '/' ? ['Vault'] : ['Vault', ...currentFolder.split('/').filter(Boolean)];

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: '#080E11', fontFamily: "'Syne', sans-serif" }}
    >
      {/* ── Sub-header ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b px-8 py-4"
        style={{ borderColor: '#162025' }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {currentFolder !== '/' && (
              <button
                onClick={handleBackClick}
                className="mr-1 flex items-center gap-1 text-[11px] transition-colors"
                style={{ color: '#3A5056' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#5A9E8F'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span style={{ color: '#1E2D30' }}>/</span>}
                <button
                  onClick={() => {
                    if (idx === 0) { setCurrentFolder('/'); }
                    else { setCurrentFolder('/' + breadcrumbs.slice(1, idx + 1).join('/')); }
                    setSelectedFile(null);
                  }}
                  className="text-[11px] transition-colors"
                  style={{ color: idx === breadcrumbs.length - 1 ? '#D8D4CC' : '#3A5056' }}
                >
                  {crumb}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#2E4248]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-[180px] rounded-md border bg-[#111A1D] py-1.5 pl-8 pr-3 text-[11px] text-[#D8D4CC] placeholder-[#2E4248] outline-none transition-all"
                style={{ borderColor: '#1E2D30', fontFamily: "'IBM Plex Mono', monospace" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#5A9E8F50'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; }}
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded border" style={{ borderColor: '#1E2D30' }}>
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="p-1.5 transition-colors"
                  style={{
                    color: viewMode === mode ? '#5A9E8F' : '#2E4248',
                    background: viewMode === mode ? '#0F1E1B' : 'transparent',
                  }}
                >
                  {mode === 'grid' ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={fetchFiles}
              className="rounded border p-1.5 transition-colors"
              style={{ borderColor: '#1E2D30', color: '#2E4248' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#5A9E8F'; e.currentTarget.style.borderColor = '#5A9E8F30'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; e.currentTarget.style.borderColor = '#1E2D30'; }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Browser area ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-8 py-6">

        {/* Loading */}
        {isLoading && (
          <div className="flex h-48 items-center justify-center">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rounded-full bg-[#5A9E8F] animate-typing-dot"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md border"
              style={{ background: '#9E5A5A12', borderColor: '#9E5A5A30' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#9E5A5A">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#9E5A5A]">{error}</p>
            <button
              onClick={fetchFiles}
              className="rounded border px-3 py-1.5 text-[11px] transition-all"
              style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#5A9E8F30', color: '#5A9E8F', background: '#5A9E8F12' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredFiles.length === 0 && filteredFolders.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md border"
              style={{ background: '#111A1D', borderColor: '#1E2D30' }}
            >
              <svg className="h-4 w-4 text-[#2A3E44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="text-[13px] text-[#3A5056]">
              No files found
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] text-[#2A3E44]">
              {searchQuery ? 'Try a different search term' : 'Run a workflow to generate outputs'}
            </p>
          </div>
        )}

        {/* ── Grid view ─────────────────────────────────────────────────────── */}
        {!isLoading && !error && viewMode === 'grid' && (filteredFiles.length > 0 || filteredFolders.length > 0) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {/* Folders */}
            {filteredFolders.map((folder, i) => (
              <button
                key={folder}
                onClick={() => handleFolderClick(folder)}
                className="animate-evolve-in group flex flex-col items-start rounded-md border p-3 text-left transition-all"
                style={{
                  background: '#111A1D',
                  borderColor: '#1E2D30',
                  animationDelay: `${i * 30}ms`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#BF8A5240'; e.currentTarget.style.background = '#17201A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2D30'; e.currentTarget.style.background = '#111A1D'; }}
              >
                <div className="mb-2.5 h-10 w-10">{getFileIcon({ type: 'folder' })}</div>
                <p
                  style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                  className="w-full truncate text-[12px] text-[#D8D4CC]"
                >
                  {folder}
                </p>
                <span
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52', borderColor: '#BF8A5230' }}
                  className="mt-1 rounded border px-1.5 py-0.5 text-[9px]"
                >
                  FOLDER
                </span>
              </button>
            ))}

            {/* Files */}
            {filteredFiles.map((file, i) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="animate-evolve-in group flex flex-col items-start rounded-md border p-3 text-left transition-all"
                  style={{
                    background: isSelected ? '#0F1E1B' : '#111A1D',
                    borderColor: isSelected ? '#5A9E8F40' : '#1E2D30',
                    animationDelay: `${(filteredFolders.length + i) * 30}ms`,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#2A4A52'; e.currentTarget.style.background = '#131D20'; } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#1E2D30'; e.currentTarget.style.background = '#111A1D'; } }}
                >
                  <div className="mb-2.5 h-10 w-10">{getFileIcon(file)}</div>
                  <p
                    style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                    className="w-full truncate text-[12px] text-[#D8D4CC]"
                  >
                    {file.name}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: getFileColor(file), borderColor: `${getFileColor(file)}30` }}
                      className="rounded border px-1.5 py-0.5 text-[9px]"
                    >
                      {getTypeLabel(file)}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[9px] text-[#2E4248]">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="mt-0.5 text-[9px] text-[#2A3E44]">
                    {formatTimeAgo(file.created_at)}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── List view ─────────────────────────────────────────────────────── */}
        {!isLoading && !error && viewMode === 'list' && (filteredFiles.length > 0 || filteredFolders.length > 0) && (
          <div className="rounded-md border overflow-hidden" style={{ borderColor: '#1E2D30' }}>
            {/* Header row */}
            <div
              className="grid grid-cols-[1fr_80px_80px_100px] gap-4 border-b px-4 py-2"
              style={{ borderColor: '#1E2D30', background: '#0F1719' }}
            >
              {['Name', 'Type', 'Size', 'Modified'].map((h) => (
                <span
                  key={h}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  className="text-[10px] uppercase tracking-widest text-[#2E4248]"
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Folders */}
            {filteredFolders.map((folder, i) => (
              <button
                key={folder}
                onClick={() => handleFolderClick(folder)}
                className="animate-evolve-in grid w-full grid-cols-[1fr_80px_80px_100px] items-center gap-4 border-b px-4 py-3 text-left transition-colors"
                style={{
                  borderColor: '#162025',
                  animationDelay: `${i * 30}ms`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#0F1E1B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-5 w-5 shrink-0">{getFileIcon({ type: 'folder' })}</div>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }} className="truncate text-[13px] text-[#D8D4CC]">
                    {folder}
                  </span>
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#BF8A52' }} className="text-[10px]">FOLDER</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">—</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">—</span>
              </button>
            ))}

            {/* Files */}
            {filteredFiles.map((file, i) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="animate-evolve-in grid w-full grid-cols-[1fr_80px_80px_100px] items-center gap-4 border-b px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: '#162025',
                    background: isSelected ? '#0F1E1B' : 'transparent',
                    animationDelay: `${(filteredFolders.length + i) * 30}ms`,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#0F1719'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-5 w-5 shrink-0">{getFileIcon(file)}</div>
                    <span
                      style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: isSelected ? '#EAE6DF' : '#D8D4CC' }}
                      className="truncate text-[13px]"
                    >
                      {file.name}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: getFileColor(file) }} className="text-[10px]">
                    {getTypeLabel(file)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
                    {formatFileSize(file.size_bytes)}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] text-[#2E4248]">
                    {formatTimeAgo(file.created_at)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document viewer overlay ──────────────────────────────────────────────── */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(7,9,10,0.85)' }}>
          <div
            className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border shadow-2xl"
            style={{ background: '#0B1215', borderColor: '#1E2D30' }}
          >
            {/* Viewer header */}
            <div
              className="flex shrink-0 items-center justify-between border-b px-6 py-4"
              style={{ borderColor: '#162025', background: '#080E11' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-7 w-7 shrink-0">{getFileIcon(selectedFile)}</div>
                <div className="min-w-0">
                  <h2
                    style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
                    className="truncate text-[14px] text-[#EAE6DF]"
                  >
                    {selectedFile.name}
                  </h2>
                  <div
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="mt-0.5 flex items-center gap-2 text-[10px] text-[#2E4248]"
                  >
                    <span style={{ color: getFileColor(selectedFile) }}>{getTypeLabel(selectedFile)}</span>
                    <span>·</span>
                    <span>{formatFileSize(selectedFile.size_bytes)}</span>
                    <span>·</span>
                    <span>{new Date(selectedFile.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {selectedFile.created_by && <><span>·</span><span>{selectedFile.created_by}</span></>}
                    {selectedFile.operation_id && <><span>·</span><span>Op #{selectedFile.operation_id}</span></>}
                  </div>
                </div>
              </div>

              <div className="ml-4 flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedFile.content) {
                      const blob = new Blob([selectedFile.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = selectedFile.name; a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", borderColor: '#1E2D30', color: '#3A5056', background: '#111A1D' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#5A9E8F'; e.currentTarget.style.borderColor = '#5A9E8F30'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#3A5056'; e.currentTarget.style.borderColor = '#1E2D30'; }}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="rounded border p-1.5 transition-all"
                  style={{ borderColor: '#1E2D30', color: '#2E4248' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#9E5A5A'; e.currentTarget.style.borderColor = '#9E5A5A30'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#2E4248'; e.currentTarget.style.borderColor = '#1E2D30'; }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Viewer body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {selectedFile.content ? (
                <article className="px-10 py-8">
                  {selectedFile.file_type === 'md' ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, borderColor: '#1E2D30' }} className="mb-4 border-b pb-3 text-[20px] text-[#EAE6DF]">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }} className="mb-3 mt-8 border-b pb-2 text-[16px] text-[#D8D4CC]">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600 }} className="mb-2 mt-5 text-[14px] text-[#C8C4BC]">{children}</h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-4 text-[13px] leading-relaxed text-[#8A8480]">{children}</p>
                        ),
                        ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[13px] text-[#8A8480]">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[13px] text-[#8A8480]">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-[#D8D4CC]">{children}</strong>,
                        em: ({ children }) => <em className="italic text-[#6A7A80]">{children}</em>,
                        blockquote: ({ children }) => (
                          <blockquote className="my-4 border-l-2 pl-4 italic text-[#6A7A80]" style={{ borderColor: '#5A9E8F50' }}>{children}</blockquote>
                        ),
                        code: ({ children, className }: any) => {
                          const isInline = !className;
                          return isInline ? (
                            <code style={{ fontFamily: "'IBM Plex Mono',monospace", background: '#0B1215', borderColor: '#1E2D30' }}
                              className="rounded border px-1.5 py-0.5 text-[11px] text-[#7BBDAE]">{children}</code>
                          ) : (
                            <code style={{ fontFamily: "'IBM Plex Mono',monospace", background: '#070C0E', borderColor: '#1E2D30' }}
                              className="my-4 block overflow-x-auto rounded border p-4 text-[11px] text-[#7BBDAE]">{children}</code>
                          );
                        },
                        a: ({ children, href }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer"
                            className="text-[#5A9E8F] underline underline-offset-2 opacity-80 hover:opacity-100">{children}</a>
                        ),
                        hr: () => <hr className="my-6" style={{ borderColor: '#1E2D30' }} />,
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto rounded-md border" style={{ borderColor: '#1E2D30' }}>
                            <table className="w-full text-[12px]">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead style={{ background: '#0F1719' }}>{children}</thead>,
                        th: ({ children }) => (
                          <th style={{ fontFamily: "'IBM Plex Mono',monospace", borderColor: '#1E2D30', color: '#4A6A72' }}
                            className="border-b px-3 py-2 text-left text-[10px] uppercase tracking-wider">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td style={{ borderColor: '#162025', color: '#6A7A80' }}
                            className="border-b px-3 py-2 text-[11px]">{children}</td>
                        ),
                      }}
                    >
                      {selectedFile.content}
                    </ReactMarkdown>
                  ) : (
                    <pre
                      style={{ fontFamily: "'IBM Plex Mono',monospace" }}
                      className="whitespace-pre-wrap text-[12px] leading-relaxed text-[#7A9A8A]"
                    >
                      {selectedFile.content}
                    </pre>
                  )}
                </article>
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <p style={{ fontFamily: "'IBM Plex Mono',monospace" }} className="text-[11px] text-[#2E4248]">
                    No content available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
