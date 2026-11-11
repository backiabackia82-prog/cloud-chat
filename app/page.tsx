"use client";

import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "../lib/firebase";
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

const ROOMS = ["general", "tech", "random"];

export default function ChatApp() {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState("general");
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

  // Firestore Messages Listener based on Selected Room
  useEffect(() => {
    try {
      // Using subcollections per room: rooms/{roomName}/messages
      const q = query(
        collection(db, "rooms", currentRoom, "messages"), 
        orderBy("createdAt", "asc")
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(msgs);
        dummyRef.current?.scrollIntoView({ behavior: "smooth" });
      }, (error) => {
        console.error("Firestore snapshot error:", error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up snapshot:", err);
    }
  }, [currentRoom]);

  // Google Login
  const signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (
        error.code === 'auth/cancelled-popup-request' || 
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/popup-blocked'
      ) {
        return;
      }
      console.error("Error signing in:", error);
    }
  };

  // Send Message to Current Room
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    try {
      await addDoc(collection(db, "rooms", currentRoom, "messages"), {
        text: input,
        uid: user.uid,
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
      });
      setInput("");
      dummyRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
    }
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

      {/* Rooms Navigation Bar */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 flex gap-2 overflow-x-auto">
        <span className="text-xs text-gray-400 self-center mr-2 font-semibold uppercase tracking-wider">Rooms:</span>
        {ROOMS.map((room) => (
          <button
            key={room}
            onClick={() => setCurrentRoom(room)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition uppercase tracking-wide ${
              currentRoom === room 
                ? "bg-blue-600 text-white shadow" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            # {room}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {user ? (
          messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <p>No messages in #{currentRoom} yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.uid === user.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 my-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <img
                      src={msg.photoURL || "https://via.placeholder.com/30"}
                      alt="avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div
                    className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg text-sm shadow ${
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
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold mb-2">Welcome to Cloud Chat!</h2>
            <p className="text-gray-400 mb-4">Please sign in with Google to start chatting in rooms.</p>
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
            placeholder={`Message #${currentRoom}...`}
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition">
            Send
          </button>
        </form>
      )}
    </main>
  );
}