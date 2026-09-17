export interface User {
  id: number;
  username: string;
  avatar: string | null;
  token?: string;
  last_seen: string;
}

export interface Post {
  id: number;
  user_id: number;
  username: string;
  avatar: string | null;
  image: string | null;
  caption: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar: string | null;
  content: string;
  created_at: string;
}

export interface Story {
  id: number;
  user_id: number;
  username: string;
  avatar: string | null;
  image: string;
  created_at: string;
}

export interface Message {
  id: number;
  sender: number;
  receiver: number;
  type: 'text' | 'image' | 'voice';
  content: string;
  created_at: string;
}

export interface Friend {
  id: number;
  username: string;
  avatar: string | null;
  status: 0 | 1; // 0 = pending, 1 = accepted
  is_sender: boolean; // Did current user send the request?
}
