"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "@/lib/firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";

interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
}

export default function ChatApp() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const dummyRef = useRef<HTMLDivElement>(null);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Messages Listener
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
      dummyRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => unsubscribe();
  }, []);

  // Google Login
  const signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  // Send Message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    await addDoc(collection(db, "messages"), {
      text: input,
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
    });

    setInput("");
    dummyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-800 shadow-md">
        <h1 className="text-xl font-bold">☁️ Cloud Chat App</h1>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:inline">{user.displayName}</span>
            <button
              onClick={() => signOut(auth)}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition"
          >
            Sign in with Google
          </button>
        )}
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {user ? (
          messages.map((msg) => {
            const isMe = msg.uid === user.uid;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!isMe && (
                  <img
                    src={msg.photoURL || "https://via.placeholder.com/30"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg text-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-700 text-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-xs text-gray-300 font-semibold mb-1">
                    {msg.displayName}
                  </p>
                  <p className="break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold mb-2">Welcome to Cloud Chat!</h2>
            <p className="text-gray-400 mb-4">Please sign in with Google to start chatting.</p>
            <button
              onClick={signIn}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition"
            >
              Sign in with Google
            </button>
          </div>
        )}
        <div ref={dummyRef} />
      </div>

      {/* Input Form */}
      {user && (
        <form onSubmit={sendMessage} className="p-4 bg-gray-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus: