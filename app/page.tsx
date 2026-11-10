'use client';

import { useState, useEffect } from 'react';
import { auth, provider, db } from './lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function Home() {
  const [user, authLoading] = useAuthState(auth);
  const [roomId, setRoomId] = useState('general');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // Safe Google Sign-In Handler with error catching
  const handleGoogleSignIn = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Ignore if user closed the popup window manually
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error("Sign-in error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, roomId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text,
        createdAt: serverTimestamp(),
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
      });
      setText('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white text-xl">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Cloud Chat Application</h1>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-lg disabled:opacity-50 transition-all"
        >
          {loading ? 'Opening Popup...' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <div className="w-1/4 border-r border-slate-700 p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-4">Chat Rooms</h2>
          <div className="space-y-2">
            {['general', 'tech', 'random'].map((room) => (
              <button
                key={room}
                onClick={() => setRoomId(room)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  roomId === room ? 'bg-blue-600' : 'hover:bg-slate-800'
                }`}
              >
                #{room}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-sm text-slate-300 truncate">
            👤 {user.displayName}
          </div>
          <button
            onClick={() => signOut(auth)}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-700 font-bold text-lg bg-slate-900/50">
          Room: #{roomId}
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.uid === user.uid ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-xs text-slate-400 mb-1">{msg.displayName}</span>
              <div
                className={`p-3 rounded-lg max-w-xs md:max-w-md break-words ${
                  msg.uid === user.uid ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-slate-700 flex gap-2 bg-slate-900/50">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}