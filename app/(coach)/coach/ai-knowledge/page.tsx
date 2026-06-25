"use client";

import React, { useState, useEffect } from 'react';
import { Brain, FileText, Plus, Search, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore';

const KNOWLEDGE_CATEGORIES = [
  "All",
  "Muscle Gain Guidelines",
  "Fat Loss Guidelines",
  "Protein Guides",
  "Creatine & Supplements",
  "Gym Rules & Etiquette",
  "Recovery Tips",
];

type KnowledgeEntry = {
  id: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
};

export default function AIKnowledgePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(KNOWLEDGE_CATEGORIES[1]);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');

  // Live sync from Firestore
  useEffect(() => {
    const q = query(collection(db, 'coach_knowledge'), orderBy('updated_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: KnowledgeEntry[] = snap.docs.map(d => {
        const data = d.data();
        const ts = data.updated_at?.toDate?.();
        return {
          id: d.id,
          title: data.title || '',
          category: data.category || 'General',
          content: data.content || '',
          updated_at: ts ? ts.toISOString().split('T')[0] : '—',
        };
      });
      setKnowledge(items);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'coach_knowledge'), {
        title: newTitle.trim(),
        category: newCategory,
        content: newContent.trim(),
        updated_at: serverTimestamp(),
      });
      setNewTitle('');
      setNewContent('');
      setNewCategory(KNOWLEDGE_CATEGORIES[1]);
      setShowAddForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (id: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'coach_knowledge', id), {
        title: editTitle,
        category: editCategory,
        content: editContent,
        updated_at: serverTimestamp(),
      });
      setEditingId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry? The AI will no longer use it.')) return;
    try {
      await deleteDoc(doc(db, 'coach_knowledge', id));
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (item: KnowledgeEntry) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditContent(item.content);
  };

  const filtered = knowledge.filter(item => {
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Brain size={14} /> Train the Assistant
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            AI <span className="text-purple-400">Knowledge Base</span>
          </h1>
          <p className="text-gray-400">Manage the information the AI assistant uses to answer member questions.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-purple-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-purple-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <Plus size={18} /> Add Entry
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-xl uppercase tracking-wider text-purple-400">New Entry</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Title (e.g. Optimal Protein Intake)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {KNOWLEDGE_CATEGORIES.slice(1).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <textarea
                placeholder="Knowledge content — this goes directly to the AI..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={5}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newTitle.trim() || !newContent.trim()}
                className="bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search knowledge..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <h3 className="font-bold uppercase tracking-widest text-sm text-gray-400 mb-4 px-2">Categories</h3>
            <div className="flex flex-col gap-1">
              {KNOWLEDGE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-purple-500/10 text-purple-400 font-bold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Knowledge List */}
        <div className="lg:col-span-3 space-y-4">
          {loading && (
            <div className="text-center py-20">
              <Loader2 size={32} className="animate-spin text-purple-400 mx-auto" />
            </div>
          )}

          {!loading && filtered.map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-6 group hover:border-gray-600 transition-colors">
              {editingId === item.id ? (
                <div className="flex flex-col gap-3">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    {KNOWLEDGE_CATEGORIES.slice(1).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(item.id)}
                      disabled={saving}
                      className="bg-purple-500 hover:bg-purple-400 text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-bold text-xl uppercase tracking-wider text-white mb-2">{item.title}</h3>
                      <span className="text-xs font-mono uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(item)}
                        className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">{item.content}</p>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-widest border-t border-gray-800 pt-4">
                    <FileText size={12} /> Last updated: {item.updated_at}
                  </div>
                </>
              )}
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-700">
              <Brain size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest">No entries found.</p>
              <p className="text-gray-600 text-sm mt-2">Add some knowledge to train the AI assistant.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
