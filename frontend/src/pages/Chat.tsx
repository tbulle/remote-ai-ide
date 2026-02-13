import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSession } from '../hooks/useSession';
import ChatView from '../components/ChatView';
import PermissionDialog from '../components/PermissionDialog';

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { client, connected } = useWebSocket(token);
  const {
    messages,
    status,
    pendingPermission,
    sendMessage,
    respondPermission,
    interrupt,
    resetSession,
  } = useSession(sessionId!, client, token);

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#16213e] bg-[#1a1a2e] shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Back"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#e0e0e0] truncate">
            Session {sessionId?.slice(0, 8)}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className={connected ? 'text-green-400' : 'text-red-400'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
            <span>{status}</span>
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <ChatView
          messages={messages}
          status={status}
          onSend={sendMessage}
          onInterrupt={interrupt}
          onReset={resetSession}
        />
      </div>

      {/* Permission Dialog */}
      {pendingPermission && (
        <PermissionDialog
          toolName={pendingPermission.toolName}
          toolInput={pendingPermission.toolInput}
          description={pendingPermission.description}
          onAllow={() => respondPermission(true)}
          onDeny={() => respondPermission(false)}
        />
      )}
    </div>
  );
}
