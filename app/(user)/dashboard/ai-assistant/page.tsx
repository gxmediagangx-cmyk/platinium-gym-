"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Square, Loader2, Sparkles, X, Settings, Trash2 } from "lucide-react";
import { submitAIMessage } from "./actions";
import { ChatMessage } from "@/lib/gemini";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, addDoc, updateDoc, deleteDoc, collection, query,
  where, getDocs, writeBatch, serverTimestamp, Timestamp, onSnapshot
} from "firebase/firestore";

type UI_Message = {
  id: string;
  role: "user" | "model";
  content: string;
  pending?: boolean;
};

type UserProfile = {
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
};

function isArabicText(text: string): boolean {
  if (!text) return false;
  const arabicChars = text.match(/[\u0600-\u06FF]/g);
  if (!arabicChars) return false;
  const totalChars = text.replace(/\s/g, "").length;
  if (totalChars === 0) return false;
  return arabicChars.length > totalChars / 2;
}

const DEFAULT_GREETING = "Hello! I am your AI Coach here at Platinum Gym. How can I help you with your fitness journey today? Looking for a workout, Egyptian meal plan, or training advice?";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<UI_Message[]>([
    { id: "msg_0", role: "model", content: DEFAULT_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [autoSent, setAutoSent] = useState(false);
  const [languageMode, setLanguageMode] = useState("auto");
  const [responseStyle, setResponseStyle] = useState("balanced");
  const [memories, setMemories] = useState<string[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(true);
  const [showNotice, setShowNotice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const sendMessageRef = useRef<(text: string, autoReview?: boolean) => Promise<void>>(null!);
  const pendingReviewRef = useRef<string | null>(null);
  const chatSnapUnsubRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sendGenRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (chatSnapUnsubRef.current) {
        chatSnapUnsubRef.current();
        chatSnapUnsubRef.current = null;
      }

      if (!user) {
        setChatLoading(false);
        return;
      }

      try {
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setUserProfile({
            name: data.name,
            age: data.age,
            weight: data.weight,
            height: data.height,
            goal: data.goal,
          });
          setLanguageMode(data.languageMode || "auto");
          setResponseStyle(data.responseStyle || "balanced");
        }
      } catch (e) {
        console.log("Could not load user profile", e);
      }

      try {
        const memQuery = query(collection(db, "users", user.uid, "aiMemory"));
        const memSnap = await getDocs(memQuery);
        const memList: string[] = [];
        memSnap.forEach((d) => {
          const text = d.data().text || "";
          if (text) memList.push(text);
        });
        setMemories(memList);
      } catch (e) {
        console.log("Could not load memories", e);
      }

      const savedChatId = localStorage.getItem("current_chat_id");
      if (savedChatId) {
        setChatId(savedChatId);
        chatSnapUnsubRef.current = onSnapshot(
          doc(db, "users", user.uid, "aiChats", savedChatId),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const loadedMessages: UI_Message[] = (data.messages || []).map(
                (m: any, i: number) => ({
                  id: `msg_${i}`,
                  role: m.role as "user" | "model",
                  content: m.content || "",
                  pending: m.pending || false,
                })
              );
              if (loadedMessages.length > 0) {
                setMessages(loadedMessages);
              }
              setChatLoading(false);
            } else {
              localStorage.removeItem("current_chat_id");
              setChatId(null);
              setChatLoading(false);
            }
          },
          () => {
            setChatLoading(false);
          }
        );
      } else {
        setChatLoading(false);
      }

      try {
        const cutoff = Timestamp.fromDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        const oldQuery = query(
          collection(db, "users", user.uid, "aiChats"),
          where("lastActivity", "<", cutoff)
        );
        const oldSnap = await getDocs(oldQuery);
        if (oldSnap.size > 0) {
          const batch = writeBatch(db);
          oldSnap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch {}

      try {
        if (!sessionStorage.getItem("ai_chat_notice_dismissed")) {
          setShowNotice(true);
        }
      } catch {}
    });
    return () => {
      unsubAuth();
      if (chatSnapUnsubRef.current) {
        chatSnapUnsubRef.current();
      }
    };
  }, []);

  const handleDeleteConversation = async () => {
    if (!chatId || !auth.currentUser) return;

    if (chatSnapUnsubRef.current) {
      chatSnapUnsubRef.current();
      chatSnapUnsubRef.current = null;
    }

    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "aiChats", chatId));
    } catch {
      console.log("Failed to delete chat");
    }

    setChatId(null);
    localStorage.removeItem("current_chat_id");
    setMessages([{ id: "msg_0", role: "model", content: DEFAULT_GREETING }]);
    setShowDeleteConfirm(false);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isLoadingRef.current = false;
    setIsLoading(false);
    sendGenRef.current += 1;
    setMessages((prev) => prev.filter((m) => !m.pending));
  };

  const sendMessage = async (text: string, autoReview?: boolean) => {
    if (!text.trim() || isLoadingRef.current) return;
    const historySnapshot = [...messages];
    const gen = sendGenRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    isLoadingRef.current = true;
    setInput("");
    setAutoSent(true);

    const msgIndex = historySnapshot.length;
    const newUserMsg: UI_Message = {
      id: `msg_${msgIndex}`,
      role: "user",
      content: text.trim(),
    };
    const updatedMessages = [...historySnapshot, newUserMsg];

    const placeholderMsg: UI_Message = {
      id: `msg_${msgIndex + 1}`,
      role: "model",
      content: "",
      pending: true,
    };
    const withPlaceholder = [...updatedMessages, placeholderMsg];
    setMessages(withPlaceholder);
    setIsLoading(true);

    let activeChatId = chatId;

    try {
      if (controller.signal.aborted) return;

      if (!activeChatId && auth.currentUser) {
        try {
          const chatRef = await addDoc(
            collection(db, "users", auth.currentUser.uid, "aiChats"),
            {
              messages: [],
              title: text.trim().slice(0, 50),
              languageMode: "auto",
              createdAt: serverTimestamp(),
              lastActivity: serverTimestamp(),
            }
          );
          activeChatId = chatRef.id;
          setChatId(activeChatId);
          localStorage.setItem("current_chat_id", activeChatId);
        } catch {}
      }

      if (controller.signal.aborted) return;

      if (activeChatId && auth.currentUser) {
        try {
          await updateDoc(
            doc(db, "users", auth.currentUser.uid, "aiChats", activeChatId),
            {
              messages: withPlaceholder.map((m) => ({
                role: m.role,
                content: m.content,
                pending: m.pending || false,
              })),
              lastActivity: serverTimestamp(),
            }
          );
        } catch {}
      }

      if (controller.signal.aborted) return;

      const history: ChatMessage[] = historySnapshot.map((m) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.content,
      }));

      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);

      const response = await submitAIMessage(
        text.trim(),
        history,
        userProfile,
        {
          languageMode,
          responseStyle,
          memories,
          chatId: activeChatId || undefined,
          uid: auth.currentUser?.uid || undefined,
          idToken,
          isSystemMessage: autoReview,
        }
      );

      if (controller.signal.aborted) return;

      if (response.success && response.text) {
        const newModelMsg: UI_Message = {
          id: `msg_${msgIndex + 1}`,
          role: "model",
          content: response.text,
        };
        setMessages([...updatedMessages, newModelMsg]);
      } else {
        const errorMsg: UI_Message = {
          id: `msg_${msgIndex + 1}`,
          role: "model",
          content:
            "Sorry, I am having trouble connecting right now. " +
            (response.error || ""),
        };
        setMessages([...updatedMessages, errorMsg]);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      const errorMsg: UI_Message = {
        id: `msg_${msgIndex + 1}`,
        role: "model",
        content: "An unexpected error occurred. Please try again.",
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      if (sendGenRef.current === gen) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  sendMessageRef.current = sendMessage;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
  };

  // Auto-review on mount — waits for user profile to load before sending
  useEffect(() => {
    let mounted = true;
    try {
      const workoutStored = localStorage.getItem("ai_workout_review");
      if (workoutStored) {
        const data = JSON.parse(workoutStored);
        localStorage.removeItem("ai_workout_review");

        if (data.autoReview && data.summary) {
          const goal = data.goal || "general fitness";
          const workoutName = data.workoutName || "My Workout";
          const userText = `Please analyze my workout and give me feedback based on my goal of ${goal}.\n\nWorkout: ${workoutName}\n\n${data.summary}`;

          if (!userProfile.name) {
            pendingReviewRef.current = userText;
            return;
          }

          const timer = setTimeout(() => {
            if (mounted) sendMessageRef.current(userText, true);
          }, 500);

          return () => {
            mounted = false;
            clearTimeout(timer);
          };
        }
      }

      const nutritionStored = localStorage.getItem("ai_nutrition_review");
      if (nutritionStored) {
        const data = JSON.parse(nutritionStored);
        localStorage.removeItem("ai_nutrition_review");

        if (data.autoReview && data.summary) {
          const goal = data.goal || "general fitness";
          const planName = data.planName || "My Plan";
          const userText = `Please analyze my nutrition and routine plan and give me feedback based on my goal of ${goal}.\n\nPlan: ${planName}\n\n${data.summary}`;

          if (!userProfile.name) {
            pendingReviewRef.current = userText;
            return;
          }

          const timer = setTimeout(() => {
            if (mounted) sendMessageRef.current(userText, true);
          }, 500);

          return () => {
            mounted = false;
            clearTimeout(timer);
          };
        }
      }

      const progressStored = localStorage.getItem("ai_progress_review");
      if (progressStored) {
        const data = JSON.parse(progressStored);
        localStorage.removeItem("ai_progress_review");

        if (data.autoReview && data.summary) {
          const userText = `Please review my progress and give me feedback and encouragement based on my goal.\n\n${data.summary}`;

          if (!userProfile.name) {
            pendingReviewRef.current = userText;
            return;
          }

          const timer = setTimeout(() => {
            if (mounted) sendMessageRef.current(userText, true);
          }, 500);

          return () => {
            mounted = false;
            clearTimeout(timer);
          };
        }
      }

      if (pendingReviewRef.current && userProfile.name) {
        const userText = pendingReviewRef.current;
        pendingReviewRef.current = null;

        const timer = setTimeout(() => {
          if (mounted) sendMessageRef.current(userText, true);
        }, 500);

        return () => {
          mounted = false;
          clearTimeout(timer);
        };
      }
    } catch {}
  }, [userProfile.name]);

  const dismissNotice = () => {
    setShowNotice(false);
    try {
      sessionStorage.setItem("ai_chat_notice_dismissed", "1");
    } catch {}
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto p-4 md:p-8">
      {showNotice && (
        <div className="mb-4 bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 flex items-start gap-3">
          <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed flex-1">
            Your AI conversations are saved and automatically deleted after 7 days for your privacy. Save anything important to Memory — it&apos;s kept permanently.
          </p>
          <button
            onClick={dismissNotice}
            className="text-gray-500 hover:text-white transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-3">
          <Sparkles size={14} /> AI Coach
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-bold text-2xl md:text-4xl uppercase tracking-wider">
            AI <span className="text-purple-400">Assistant</span>
          </h1>
          <div className="flex items-center gap-1">
            {chatId && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1 mr-1">
                  <span className="text-[10px] text-red-300 font-mono">Delete all messages?</span>
                  <button
                    onClick={handleDeleteConversation}
                    className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-bold uppercase hover:bg-red-500/30 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-[9px] font-bold uppercase hover:bg-gray-600 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-800/50"
                  title="Delete conversation"
                >
                  <Trash2 size={18} />
                </button>
              )
            )}
            <Link
              href="/dashboard/ai-assistant/settings"
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border border-gray-700/50 text-gray-400 bg-gray-800/30 hover:border-purple-500/30 hover:text-purple-400 transition-colors whitespace-nowrap"
            >
              {languageMode === "english" ? "English" : languageMode === "arabic" ? "Arabic" : "Auto Detect"}
            </Link>
            <Link
              href="/dashboard/ai-assistant/settings"
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border border-gray-700/50 text-gray-400 bg-gray-800/30 hover:border-purple-500/30 hover:text-purple-400 transition-colors whitespace-nowrap"
            >
              {responseStyle === "quick" ? "Quick" : responseStyle === "detailed" ? "Detailed" : "Balanced"}
            </Link>
            <Link
              href="/dashboard/ai-assistant/settings"
              className="text-gray-500 hover:text-purple-400 transition-colors p-2 rounded-lg hover:bg-gray-800/50"
              title="AI Settings"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
        {userProfile.name && (
          <p className="text-gray-400 text-sm mt-1">
            Personalized for <span className="text-white font-medium">{userProfile.name}</span>
            {userProfile.weight && ` · ${userProfile.weight}kg`}
            {userProfile.height && ` · ${userProfile.height}cm`}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
        {chatLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-purple-400 animate-spin" />
          </div>
        ) : (
          messages.map((msg) =>
            msg.pending ? (
              <div key={msg.id} className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} className="text-purple-400" />
                </div>
                <div className="bg-gray-800/80 border border-gray-700/50 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="text-purple-400 animate-spin" />
                    <span className="text-sm text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-purple-400" />
                  </div>
                )}
                <div
                  dir={isArabicText(msg.content) ? "rtl" : "ltr"}
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-tr-sm"
                      : "bg-gray-800/80 border border-gray-700/50 text-gray-200 rounded-tl-sm"
                  } ${isArabicText(msg.content) ? "text-right" : ""}`}
                >
                  {msg.role === "model" ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:text-purple-300 prose-strong:text-white">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
            )
          )
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-3 mt-4 flex-shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI coach anything..."
          className="flex-1 bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={handleStop}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2"
            title="Stop generating"
          >
            <Square size={16} className="fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <Send size={16} />
          </button>
        )}
      </form>
    </div>
  );
}
