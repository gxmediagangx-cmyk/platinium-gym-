"use client";

import React, { useState, useEffect } from "react";
import {
  Phone, MapPin, Clock, BarChart3, Save, Loader2, CheckCircle,
  Plus, X, Star, Link as LinkIcon, AlertTriangle, Globe, Mail, MessageCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const TABS = [
  { id: "info", label: "Contact Info", icon: Phone },
  { id: "location", label: "Location", icon: MapPin },
  { id: "hours", label: "Working Hours", icon: Clock },
  { id: "stats", label: "Site Stats", icon: BarChart3 },
] as const;

type PhoneEntry = { number: string; isPrimary: boolean };

type ContactData = {
  phoneNumbers: PhoneEntry[];
  whatsappPrimary: string;
  whatsappSecondary: string;
  email: string;
  facebookLink: string;
  address: string;
  googleMapsLink: string;
  workingHoursMain: string;
  workingHoursExceptions: string;
  eliteMachines: number;
  proCoaches: number;
  weeklyClasses: number;
  workingHoursDisplay: string;
};

const defaultData = (): ContactData => ({
  phoneNumbers: [],
  whatsappPrimary: "",
  whatsappSecondary: "",
  email: "",
  facebookLink: "",
  address: "",
  googleMapsLink: "",
  workingHoursMain: "",
  workingHoursExceptions: "",
  eliteMachines: 0,
  proCoaches: 0,
  weeklyClasses: 0,
  workingHoursDisplay: "",
});

export default function CoachContactPage() {
  const [data, setData] = useState<ContactData>(defaultData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("info");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "contact"));
        if (snap.exists()) {
          const d = snap.data();
          setData({
            phoneNumbers: d.phoneNumbers || [],
            whatsappPrimary: d.whatsappPrimary || d.whatsappNumber || "",
            whatsappSecondary: d.whatsappSecondary || "",
            email: d.email || "",
            facebookLink: d.facebookLink || "",
            address: d.address || "",
            googleMapsLink: d.googleMapsLink || "",
            workingHoursMain: d.workingHoursMain || "",
            workingHoursExceptions: d.workingHoursExceptions || "",
            eliteMachines: d.eliteMachines ?? 0,
            proCoaches: d.proCoaches ?? 0,
            weeklyClasses: d.weeklyClasses ?? 0,
            workingHoursDisplay: d.workingHoursDisplay || "",
          });
        }
      } catch {
        setError("Failed to load contact settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const addPhoneNumber = () => {
    const num = newPhone.trim();
    if (!num) return;
    setData((prev) => ({
      ...prev,
      phoneNumbers: [
        ...prev.phoneNumbers,
        { number: num, isPrimary: prev.phoneNumbers.length === 0 },
      ],
    }));
    setHasChanges(true);
    setNewPhone("");
  };

  const removePhoneNumber = (index: number) => {
    setData((prev) => {
      const updated = prev.phoneNumbers.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return { ...prev, phoneNumbers: updated };
    });
    setHasChanges(true);
  };

  const setPrimaryPhone = (index: number) => {
    setData((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((p, i) => ({
        ...p,
        isPrimary: i === index,
      })),
    }));
    setHasChanges(true);
  };

  const updatePhoneNumber = (index: number, value: string) => {
    setData((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((p, i) =>
        i === index ? { ...p, number: value } : p
      ),
    }));
    setHasChanges(true);
  };

  const updateField = (field: keyof ContactData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, "settings", "contact"), {
        phoneNumbers: data.phoneNumbers,
        whatsappPrimary: data.whatsappPrimary.trim(),
        whatsappSecondary: data.whatsappSecondary.trim(),
        email: data.email.trim(),
        facebookLink: data.facebookLink.trim(),
        address: data.address.trim(),
        googleMapsLink: data.googleMapsLink.trim(),
        workingHoursMain: data.workingHoursMain.trim(),
        workingHoursExceptions: data.workingHoursExceptions.trim(),
        eliteMachines: data.eliteMachines,
        proCoaches: data.proCoaches,
        weeklyClasses: data.weeklyClasses,
        workingHoursDisplay: data.workingHoursDisplay.trim(),
      }, { merge: true });
      setHasChanges(false);
      showSuccess("Contact settings saved successfully!");
    } catch {
      setError("Failed to save contact settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-brand-gray rounded-lg" />
          <div className="h-6 w-32 bg-brand-gray rounded-lg" />
          <div className="h-64 bg-brand-gray rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
          <Globe size={14} /> Contact Management
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          <span className="text-purple-400">Contact</span> Settings
        </h1>
        <p className="text-gray-400">Manage gym contact info, location, hours, and stats displayed on the website.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1 w-full overflow-x-auto mb-6 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-purple-500 text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contact Info Tab */}
      {activeTab === "info" && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          {/* Phone Numbers */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Phone Numbers</h3>
            </div>
            {data.phoneNumbers.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {data.phoneNumbers.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                    <input
                      type="text"
                      value={entry.number}
                      onChange={(e) => updatePhoneNumber(i, e.target.value)}
                      className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                      placeholder="e.g. +20 100 000 0000"
                    />
                    {entry.isPrimary ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                        <Star size={10} /> Primary
                      </span>
                    ) : (
                      <button
                        onClick={() => setPrimaryPhone(i)}
                        className="text-[10px] font-mono text-gray-500 hover:text-purple-400 uppercase tracking-widest"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => removePhoneNumber(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhoneNumber(); } }}
                placeholder="e.g. +20 100 000 0000"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={addPhoneNumber}
                disabled={!newPhone.trim()}
                className="flex items-center gap-1.5 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Plus size={14} /> Add Number
              </button>
            </div>
          </div>

          {/* WhatsApp Primary */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">WhatsApp Number 1</h3>
            </div>
            <input
              type="text"
              value={data.whatsappPrimary}
              onChange={(e) => updateField("whatsappPrimary", e.target.value)}
              placeholder="e.g. +20 100 000 0000"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* WhatsApp Secondary */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">WhatsApp Number 2 <span className="text-gray-500 font-normal normal-case tracking-normal">(Optional)</span></h3>
            </div>
            <input
              type="text"
              value={data.whatsappSecondary}
              onChange={(e) => updateField("whatsappSecondary", e.target.value)}
              placeholder="e.g. +20 100 000 0000"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Email */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Mail size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Email Address</h3>
            </div>
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="e.g. info@platinumgym.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Facebook */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Facebook Link</h3>
            </div>
            <input
              type="url"
              value={data.facebookLink}
              onChange={(e) => updateField("facebookLink", e.target.value)}
              placeholder="https://facebook.com/platinumgym"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-gray-500 font-mono mt-1">Include https://</p>
          </div>
        </div>
      )}

      {/* Location Tab */}
      {activeTab === "location" && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Address</h3>
            </div>
            <textarea
              value={data.address}
              onChange={(e) => updateField("address", e.target.value)}
              rows={3}
              placeholder="e.g. 123 Gym Street, Cairo, Egypt"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Google Maps Link</h3>
            </div>
            <input
              type="url"
              value={data.googleMapsLink}
              onChange={(e) => updateField("googleMapsLink", e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            {data.googleMapsLink && (
              <div className="mt-4">
                <a
                  href={data.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-purple-500/20 transition-all"
                >
                  <MapPin size={16} /> View on Map
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Working Hours Tab */}
      {activeTab === "hours" && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Main Hours</h3>
            </div>
            <textarea
              value={data.workingHoursMain}
              onChange={(e) => updateField("workingHoursMain", e.target.value)}
              rows={4}
              placeholder={"e.g. 11 AM - 1 PM Ladies Only\n1 PM - 2 AM Men"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none font-mono"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-purple-400" />
              <h3 className="font-bold text-base uppercase tracking-wider text-white">Exceptions</h3>
            </div>
            <textarea
              value={data.workingHoursExceptions}
              onChange={(e) => updateField("workingHoursExceptions", e.target.value)}
              rows={4}
              placeholder={"e.g. Except Sat, Mon, Wed 6-8 PM Ladies Only"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none font-mono"
            />
          </div>
        </div>
      )}

      {/* Site Stats Tab */}
      {activeTab === "stats" && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 mb-1 block">Elite Machines</label>
              <input
                type="number"
                value={data.eliteMachines || ""}
                onChange={(e) => updateField("eliteMachines", parseInt(e.target.value) || 0)}
                min={0}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 mb-1 block">Pro Coaches</label>
              <input
                type="number"
                value={data.proCoaches || ""}
                onChange={(e) => updateField("proCoaches", parseInt(e.target.value) || 0)}
                min={0}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 mb-1 block">Weekly Classes</label>
              <input
                type="number"
                value={data.weeklyClasses || ""}
                onChange={(e) => updateField("weeklyClasses", parseInt(e.target.value) || 0)}
                min={0}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 mb-1 block">Working Hours Display</label>
              <input
                type="text"
                value={data.workingHoursDisplay}
                onChange={(e) => updateField("workingHoursDisplay", e.target.value)}
                placeholder="e.g. Open 24/7"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-8 py-3.5 rounded-xl font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${
            hasChanges
              ? "bg-purple-500 text-black hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              : "bg-purple-900 text-gray-400 opacity-40 cursor-not-allowed"
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 border-l-4 border-emerald-500 text-white rounded-xl py-3.5 px-5 shadow-2xl flex items-center gap-3 animate-slide-up">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <span className="text-sm font-semibold tracking-wide">{successMsg}</span>
        </div>
      )}
    </div>
  );
}
