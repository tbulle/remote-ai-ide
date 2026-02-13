import { useState, useEffect } from 'react';
import { apiCall } from '../api/rest';

interface Project {
  path: string;
  name: string;
}

interface ProjectSelectorProps {
  token: string;
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
}

export default function ProjectSelector({ token, onSelect, onCancel }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiCall<Project[]>('/api/projects', token)
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSelect = async (projectPath: string) => {
    setCreating(true);
    setError(null);
    try {
      const result = await apiCall<{ id: string }>('/api/sessions', token, {
        method: 'POST',
        body: JSON.stringify({ projectPath }),
      });
      onSelect(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-[#16213e] w-full sm:max-w-lg sm:rounded-xl rounded-t-xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#e0e0e0]">Select Project</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-200 p-1"
            title="Close"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/40 text-red-300 rounded-lg p-3 mb-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-center py-8">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No projects found</div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.path}
                onClick={() => handleSelect(project.path)}
                disabled={creating}
                className="w-full text-left bg-[#1a1a2e] hover:bg-[#0f3460] rounded-lg p-3 min-h-[44px] transition-colors disabled:opacity-50"
              >
                <div className="text-sm font-medium text-[#e0e0e0]">{project.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{project.path}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
