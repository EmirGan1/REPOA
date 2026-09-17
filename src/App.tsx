import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { MessageSquare, LayoutGrid, Users, UserCircle2, Globe } from "lucide-react";
import Auth from "./components/Auth";
import Feed from "./components/Feed";
import Chats from "./components/Chats";
import Friends from "./components/Friends";
import Profile from "./components/Profile";
import GlobalChat from "./components/GlobalChat";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("lan_token"));
  const [username, setUsername] = useState<string>(localStorage.getItem("lan_username") || "");
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem("lan_avatar"));
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(Number(localStorage.getItem("lan_user_id")) || 0);
  
  const [activeTab, setActiveTab] = useState<"global" | "chats" | "feed" | "friends" | "profile">("chats");

  useEffect(() => {
    if (token) {
      const newSocket = io({ auth: { token } });
      
      newSocket.on("connect", () => {
        setSocket(newSocket);
      });

      newSocket.on("connect_error", () => {
        handleLogout();
      });

      newSocket.on("online_users", (users: number[]) => {
        setOnlineUsers(users);
      });

      newSocket.on("your_id", (id: number) => {
        setCurrentUserId(id);
        localStorage.setItem("lan_user_id", id.toString());
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUsername: string, newAvatar: string | null, id: number) => {
    localStorage.setItem("lan_token", newToken);
    localStorage.setItem("lan_username", newUsername);
    localStorage.setItem("lan_user_id", id.toString());
    if(newAvatar) localStorage.setItem("lan_avatar", newAvatar);
    setToken(newToken);
    setUsername(newUsername);
    setAvatar(newAvatar);
    setCurrentUserId(id);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem("lan_token");
    localStorage.removeItem("lan_username");
    localStorage.removeItem("lan_avatar");
    localStorage.removeItem("lan_user_id");
    setToken(null);
    if (socket) socket.disconnect();
    window.location.reload();
  };

  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // To find currentUserId, we can just fetch it implicitly from any friend or assume it's set on backend.
  // Actually, we need currentUserId in Chats.tsx for `isMine = msg.sender === currentUserId`.
  // To get it, we can decode it, or since we didn't return it, we can just use a quick socket call if we added one, but we didn't. 
  // Workaround: when we send a message, we see it echo. Or we can just modify the backend to emit "your_id" on connect!
  // I will just add that to the backend quickly.

  return (
    <div className="flex h-screen bg-white md:bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-24 lg:w-64 flex-col bg-white border-r border-slate-200">
        <div className="p-6">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight hidden lg:block">KapsApp</h1>
          <h1 className="text-2xl font-black text-blue-600 tracking-tight lg:hidden">KA</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Globe />} label="Genel Sohbet" active={activeTab === 'global'} onClick={() => setActiveTab('global')} />
          <NavItem icon={<MessageSquare />} label="Sohbetler" active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} />
          <NavItem icon={<LayoutGrid />} label="Akış" active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <NavItem icon={<Users />} label="Arkadaşlar" active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} />
          <NavItem icon={<UserCircle2 />} label="Profil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full max-w-full">
        {activeTab === 'global' && <GlobalChat socket={socket} currentUserId={currentUserId} />}
        {activeTab === 'chats' && <Chats socket={socket} currentUserId={currentUserId} onlineUsers={onlineUsers} />}
        {activeTab === 'feed' && <Feed socket={socket} currentUserId={currentUserId} />}
        {activeTab === 'friends' && <Friends socket={socket} currentUsername={username} onlineUsers={onlineUsers} />}
        {activeTab === 'profile' && <Profile socket={socket} username={username} avatar={avatar} onLogout={handleLogout} />}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden border-t border-slate-200 bg-white/80 backdrop-blur-md pb-safe">
        <nav className="flex justify-around p-3">
          <MobileNavItem icon={<Globe />} active={activeTab === 'global'} onClick={() => setActiveTab('global')} />
          <MobileNavItem icon={<MessageSquare />} active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} />
          <MobileNavItem icon={<LayoutGrid />} active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <MobileNavItem icon={<Users />} active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} />
          <MobileNavItem icon={<UserCircle2 />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3 lg:px-4 rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
    >
      <div className={active ? 'text-blue-600' : 'text-slate-500'}>{icon}</div>
      <span className="hidden lg:block">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {icon}
    </button>
  );
}

