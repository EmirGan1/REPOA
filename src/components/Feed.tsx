import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { Post, Story } from "../types";
import { Heart, MessageCircle, ImagePlus, UserRound, Plus } from "lucide-react";

export default function Feed({ socket, currentUserId }: { socket: Socket | null, currentUserId: number }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);

  useEffect(() => {
    if (!socket) return;
    const loadData = () => {
      socket.emit("get_feed", (data: Post[]) => setPosts(data));
      socket.emit("get_stories", (data: Story[]) => setStories(data));
    };
    loadData();
    socket.on("feed_updated", loadData);
    socket.on("stories_updated", loadData);
    
    return () => {
      socket.off("feed_updated", loadData);
      socket.off("stories_updated", loadData);
    };
  }, [socket]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostCaption && !newPostImage) return;
    let imageUrl = null;
    if (newPostImage) {
      const formData = new FormData();
      formData.append("file", newPostImage);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        imageUrl = data.url;
      } catch (err) { console.error(err); return; }
    }
    socket?.emit("create_post", { image: imageUrl, caption: newPostCaption });
    setNewPostCaption("");
    setNewPostImage(null);
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !socket) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      socket.emit("create_story", data.url);
    } catch (err) { console.error(err); }
  };

  const handleLike = (postId: number) => {
    socket?.emit("like_post", postId);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-xl mx-auto pb-20">
        
        {/* Stories */}
        <div className="bg-white p-4 border-b border-slate-100 flex gap-4 overflow-x-auto shadow-sm sticky top-0 z-10 scrollbar-hide">
          <div className="flex flex-col items-center gap-1 min-w-[72px]">
            <div className="relative w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer">
              <Plus size={24} className="text-slate-400" />
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleStoryUpload} />
            </div>
            <span className="text-xs font-medium text-slate-500">Hikaye Ekle</span>
          </div>
          {stories.map(story => (
            <div key={story.id} className="flex flex-col items-center gap-1 min-w-[72px]">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                <img src={story.image} className="w-full h-full rounded-full object-cover border-2 border-white" />
              </div>
              <span className="text-xs font-medium text-slate-700 truncate w-full text-center">{story.username}</span>
            </div>
          ))}
        </div>

        {/* Create Post */}
        <div className="bg-white p-4 my-4 shadow-sm border border-slate-100 md:rounded-2xl">
          <form onSubmit={handlePostSubmit}>
            <textarea 
              placeholder="Ne düşünüyorsun?"
              className="w-full border-none focus:ring-0 resize-none mb-3 text-slate-700 placeholder-slate-400"
              rows={2}
              value={newPostCaption}
              onChange={e => setNewPostCaption(e.target.value)}
            />
            {newPostImage && (
              <div className="relative mb-3">
                <img src={URL.createObjectURL(newPostImage)} className="rounded-xl max-h-64 object-cover" />
                <button type="button" onClick={() => setNewPostImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 text-xs">X</button>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
              <label className="text-blue-500 hover:bg-blue-50 p-2 rounded-full cursor-pointer transition-colors flex items-center gap-2">
                <ImagePlus size={20} />
                <span className="text-sm font-medium">Fotoğraf</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setNewPostImage(e.target.files?.[0] || null)} />
              </label>
              <button 
                type="submit" 
                disabled={!newPostCaption && !newPostImage}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-full shadow-md transition-colors"
              >
                Paylaş
              </button>
            </div>
          </form>
        </div>

        {/* Posts */}
        <div className="space-y-4 md:px-0">
          {posts.map(post => (
            <div key={post.id} className="bg-white border-y md:border border-slate-100 md:rounded-2xl shadow-sm">
              <div className="p-4 flex items-center gap-3">
                {post.avatar ? <img src={post.avatar} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><UserRound size={20} className="text-slate-400" /></div>}
                <div>
                  <h3 className="font-bold text-slate-800 text-[15px] leading-tight">{post.username}</h3>
                  <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              {post.caption && <p className="px-4 pb-3 text-slate-800 text-[15px]">{post.caption}</p>}
              {post.image && <img src={post.image} className="w-full max-h-96 object-cover bg-slate-50" />}
              
              <div className="px-4 py-3 border-t border-slate-50 flex items-center gap-6">
                <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 transition-colors ${post.is_liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}>
                  <Heart size={22} fill={post.is_liked ? 'currentColor' : 'none'} />
                  <span className="font-medium text-sm">{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors">
                  <MessageCircle size={22} />
                  <span className="font-medium text-sm">Yorum</span>
                </button>
              </div>
            </div>
          ))}
          
          {posts.length === 0 && (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
              Henüz gönderi yok.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
