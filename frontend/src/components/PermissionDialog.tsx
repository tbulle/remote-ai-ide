interface PermissionDialogProps {
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  onAllow: () => void;
  onDeny: () => void;
}

export default function PermissionDialog({
  toolName,
  toolInput,
  description,
  onAllow,
  onDeny,
}: PermissionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-[#16213e] w-full sm:max-w-lg sm:rounded-xl rounded-t-xl p-5 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-1">
          Permission Request
        </h2>

        <div className="bg-[#0f3460] rounded-lg px-3 py-2 mb-3">
          <span className="text-sm font-mono text-blue-300">{toolName}</span>
        </div>

        <p className="text-sm text-gray-300 mb-3">{description}</p>

        <div className="bg-[#0d1117] rounded-lg p-3 mb-4 overflow-x-auto">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(toolInput, null, 2)}
          </pre>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-medium min-h-[44px] transition-colors"
          >
            Deny
          </button>
          <button
            onClick={onAllow}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white rounded-lg py-3 text-sm font-medium min-h-[44px] transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
