import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Send, Image as ImageIcon, Mic } from "lucide-react";

export default function GlobalChat({ socket, currentUserId }: { socket: Socket | null, currentUserId: number }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (socket) {
      socket.emit("get_global_messages", (msgs: any[]) => setMessages(msgs));
      
      const onNewMsg = (msg: any) => {
        setMessages((prev) => [...prev, msg]);
      };
      
      socket.on("new_global_message", onNewMsg);
      return () => { socket.off("new_global_message", onNewMsg); };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && socket) {
      socket.emit("send_global_message", { type: "text", content: newMessage });
      setNewMessage("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        socket.emit("send_global_message", { type: "image", content: data.url });
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url && socket) {
          socket.emit("send_global_message", { type: "audio", content: data.url });
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Audio recording error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10 flex items-center justify-between">
        <h2 className="font-bold text-lg text-slate-800">Genel Sohbet</h2>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Herkes</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMine = msg.sender === currentUserId;
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-3 ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                
                {!isMine && (
                  <div className="flex items-center gap-2 mb-1">
                    {msg.sender_avatar ? (
                      <img src={msg.sender_avatar} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">
                        {msg.sender_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-blue-600">{msg.sender_name}</span>
                  </div>
                )}
                
                {msg.type === "text" && <p className="break-words text-[15px] leading-relaxed">{msg.content}</p>}
                {msg.type === "image" && <img src={msg.content} alt="img" className="rounded-xl max-h-64 object-cover" />}
                {msg.type === "audio" && (
                  <audio controls src={msg.content} className="max-w-[200px] h-10" />
                )}
                <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-200 pb-safe">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <label className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full cursor-pointer transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <ImageIcon size={22} />
          </label>
          <input 
            type="text" 
            placeholder="Mesaj yaz..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-slate-100 border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
          />
          {newMessage.trim() ? (
            <button onClick={handleSend} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md">
              <Send size={20} />
            </button>
          ) : (
            <button 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-3 rounded-full transition-all shadow-md ${isRecording ? 'bg-red-500 text-white scale-110 animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
