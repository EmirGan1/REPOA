import { useState } from "react";
import { Socket } from "socket.io-client";
import { Camera, LogOut, UserRound } from "lucide-react";
import Avatar from "./Avatar";

export default function Profile({ socket, username, avatar, color, onLogout, onAvatarUpdated }: { socket: Socket | null, username: string, avatar: string | null, color?: string, onLogout: () => void, onAvatarUpdated: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && socket) {
        socket.emit("update_avatar", data.url);
        onAvatarUpdated(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col items-center mt-12">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center">
            <Avatar url={avatar} name={username} color={color} size={32} />
          </div>
          <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md shadow-blue-500/20 transition-colors">
            <Camera size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
          </label>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-1">{username}</h2>
        <p className="text-slate-500 text-sm mb-8">Çevrimiçi</p>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-colors"
        >
          <LogOut size={20} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
