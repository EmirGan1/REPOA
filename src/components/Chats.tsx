import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Friend, Message } from "../types";
import { Send, Image as ImageIcon, Mic, UserRound, Users, Plus, X } from "lucide-react";

type Group = {
  id: number;
  name: string;
  creator: number;
  members: number[];
  created_at: string;
};

export default function Chats({ socket, currentUserId, onlineUsers }: { socket: Socket | null, currentUserId: number, onlineUsers: number[] }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [activeChat, setActiveChat] = useState<Friend | Group | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);

  useEffect(() => {
    if (!socket) return;
    const loadFriends = () => socket.emit("get_friends", (data: Friend[]) => setFriends(data.filter(f => f.status === 1)));
    const loadGroups = () => socket.emit("get_groups", (data: Group[]) => setGroups(data));
    
    loadFriends();
    loadGroups();
    
    socket.on("friends_updated", loadFriends);
    socket.on("groups_updated", loadGroups);
    
    return () => { 
      socket.off("friends_updated", loadFriends); 
      socket.off("groups_updated", loadGroups);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !activeChat) return;
    
    if (activeTab === "friends") {
      socket.emit("get_messages", activeChat.id, setMessages);
    } else {
      socket.emit("get_group_messages", activeChat.id, setMessages);
    }
    
    const handleNewMsg = (msg: any) => {
      if (activeTab === "friends") {
        if ((msg.sender === activeChat.id && msg.receiver === currentUserId) || 
            (msg.sender === currentUserId && msg.receiver === activeChat.id)) {
          setMessages(prev => [...prev, msg]);
        }
      } else {
        if (msg.group_id === activeChat.id) {
          setMessages(prev => [...prev, msg]);
        }
      }
    };
    
    socket.on(activeTab === "friends" ? "new_message" : "new_group_message", handleNewMsg);
    return () => { 
      socket.off(activeTab === "friends" ? "new_message" : "new_group_message", handleNewMsg); 
    };
  }, [socket, activeChat, currentUserId, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChat || !socket) return;
    
    if (activeTab === "friends") {
      socket.emit("send_message", { receiver: activeChat.id, type: "text", content: text.trim() });
    } else {
      socket.emit("send_group_message", { group_id: activeChat.id, type: "text", content: text.trim() });
    }
    setText("");
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activeChat || !socket) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        if (activeTab === "friends") {
          socket.emit("send_message", { receiver: activeChat.id, type: "image", content: data.url });
        } else {
          socket.emit("send_group_message", { group_id: activeChat.id, type: "image", content: data.url });
        }
      }
    } catch (err) { console.error(err); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];
      
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "voice.webm");
        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok && socket && activeChat) {
            if (activeTab === "friends") {
              socket.emit("send_message", { receiver: activeChat.id, type: "voice", content: data.url });
            } else {
              socket.emit("send_group_message", { group_id: activeChat.id, type: "voice", content: data.url });
            }
          }
        } catch (err) { console.error(err); }
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err) { console.error("Mic access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedFriends.length === 0 || !socket) return;
    socket.emit("create_group", { name: newGroupName.trim(), members: selectedFriends }, (group: Group) => {
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedFriends([]);
      setActiveTab("groups");
      setActiveChat(group);
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10 flex flex-col gap-3">
          <h2 className="text-xl font-bold text-slate-800">Sohbetler</h2>
          
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => { setActiveTab("friends"); setActiveChat(null); }} 
              className={`flex-1 py-1 text-sm font-medium rounded-md ${activeTab === 'friends' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Kişiler
            </button>
            <button 
              onClick={() => { setActiveTab("groups"); setActiveChat(null); }} 
              className={`flex-1 py-1 text-sm font-medium rounded-md ${activeTab === 'groups' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Gruplar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 relative">
          {activeTab === "friends" ? (
            friends.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Arkadaş ekleyerek sohbete başlayın.</div>
            ) : (
              friends.map(f => {
                const isOnline = onlineUsers.includes(f.id);
                return (
                  <button 
                    key={f.id} 
                    onClick={() => setActiveChat(f)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-slate-100 transition-colors ${activeChat?.id === f.id ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      {f.avatar ? <img src={f.avatar} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center"><UserRound size={24} className="text-slate-400" /></div>}
                      {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <h3 className="font-semibold text-slate-800 truncate">{f.username}</h3>
                      <p className="text-xs text-slate-500 truncate">{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</p>
                    </div>
                  </button>
                )
              })
            )
          ) : (
            <>
              {groups.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Henüz hiçbir gruba katılmadınız.</div>
              ) : (
                groups.map(g => (
                  <button 
                    key={g.id} 
                    onClick={() => setActiveChat(g)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-slate-100 transition-colors ${activeChat?.id === g.id ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Users size={24} /></div>
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <h3 className="font-semibold text-slate-800 truncate">{g.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{g.members.length} Üye</p>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
          
          {activeTab === "groups" && (
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="absolute bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#F0F2F5] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <Send size={32} className="text-slate-300 ml-1" />
            </div>
            <p>Sohbet etmek için bir {activeTab === "friends" ? "arkadaş" : "grup"} seçin</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center gap-3 shadow-sm z-10">
              <button className="md:hidden p-2 -ml-2 text-blue-600" onClick={() => setActiveChat(null)}>Geri</button>
              
              {activeTab === "friends" ? (
                <div className="relative">
                  {(activeChat as Friend).avatar ? <img src={(activeChat as Friend).avatar!} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><UserRound size={20} className="text-slate-400" /></div>}
                  {onlineUsers.includes(activeChat.id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>}
                </div>
              ) : (
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Users size={20} /></div>
              )}
              
              <div>
                <h3 className="font-bold text-slate-800 leading-tight">{(activeChat as Friend).username || (activeChat as Group).name}</h3>
                {activeTab === "friends" ? (
                  <span className="text-xs text-slate-500">{onlineUsers.includes(activeChat.id) ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                ) : (
                  <span className="text-xs text-slate-500">{(activeChat as Group).members.length} Üye</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isMine = msg.sender === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-2 px-3 shadow-sm ${isMine ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none border border-slate-100'}`}>
                      {activeTab === "groups" && !isMine && (
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_avatar ? (
                            <img src={msg.sender_avatar} alt="avatar" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-500">
                              {msg.sender_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[11px] font-semibold text-blue-600">{msg.sender_name}</span>
                        </div>
                      )}
                      
                      {msg.type === 'text' && <p className="text-[15px] text-slate-800 leading-relaxed break-words">{msg.content}</p>}
                      {msg.type === 'image' && <img src={msg.content} className="max-w-full rounded-lg" />}
                      {msg.type === 'voice' && <audio src={msg.content} controls className="h-10 max-w-[200px]" />}
                      <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-green-700/60' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-[#f0f2f5] p-3 flex items-center gap-2 pb-safe">
              <label className="p-3 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full cursor-pointer transition-colors">
                <ImageIcon size={22} />
                <input type="file" accept="image/*" className="hidden" onChange={handleSendImage} />
              </label>
              <form onSubmit={handleSendText} className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Bir mesaj yazın..." 
                  className="w-full bg-white border-transparent focus:ring-0 focus:outline-none py-3 px-4 rounded-xl shadow-sm text-[15px]"
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
              </form>
              {text.trim() ? (
                <button onClick={handleSendText} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-md">
                  <Send size={20} />
                </button>
              ) : (
                <button 
                  onMouseDown={startRecording} 
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-3 rounded-full transition-colors shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  <Mic size={20} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Yeni Grup Oluştur</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100">
              <input 
                type="text" 
                placeholder="Grup Adı" 
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Üye Seçimi</h4>
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <p className="text-sm text-slate-500">Grup kuracak arkadaşınız yok.</p>
                ) : (
                  friends.map(f => (
                    <label key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedFriends.includes(f.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedFriends([...selectedFriends, f.id]);
                          else setSelectedFriends(selectedFriends.filter(id => id !== f.id));
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      {f.avatar ? <img src={f.avatar} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center"><UserRound size={16} className="text-slate-400" /></div>}
                      <span className="text-sm font-medium text-slate-700">{f.username}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedFriends.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors shadow-sm"
              >
                Grubu Oluştur ({selectedFriends.length} Kişi)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
