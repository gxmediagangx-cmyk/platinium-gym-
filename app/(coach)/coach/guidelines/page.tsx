"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Loader2, Save, CheckCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const MAX_CHARS = 5000;

const DEFAULT_QUICK_EN = `Welcome to Platinum Gym!

- Members must present their membership card at entry
- Proper gym attire required at all times
- Re-rack weights after use
- Respect all equipment and fellow members
- Ladies-only section: 11 AM - 1 PM daily
- Men & mixed: 1 PM - 2 AM daily
- Lockers available — bring your own lock
- Personal training available — ask at reception
- Classes must be booked in advance
- No food inside the gym floor
- Photography only with permission
- Membership is non-transferable`;

const DEFAULT_DETAILED_EN = `Welcome to Platinum Gym — Your Complete Fitness Guide

MEMBERSHIP & ACCESS
Your membership gives you full access to all gym facilities during operating hours. Please present your membership card or show your app profile at the entrance. Memberships are personal and non-transferable.

OPERATING HOURS
Ladies Only: 11:00 AM - 1:00 PM daily
Mixed & Men: 1:00 PM - 2:00 AM daily
Special exceptions: Saturday, Monday, Wednesday — 6:00 PM to 8:00 PM Ladies Only

GYM FLOOR RULES
- Always re-rack your weights after use
- Wipe down equipment after each use
- Proper athletic attire required at all times
- No street shoes on the gym floor
- Keep noise levels respectful

CLASSES
We offer a variety of group fitness classes including Aerobics, Gymnastics, Boxing, Zumba, and more. Classes must be booked in advance through the app or at reception. Check the Classes tab for the full schedule.

COACHING & PERSONAL TRAINING
Our certified coaches are available for personal training sessions. Visit the Coaches tab to meet our team and book a session. The AI Assistant can also help answer your fitness questions 24/7.

NUTRITION SUPPORT
Access personalized nutrition plans through the Nutrition tab in your dashboard. Our coaches have prepared templates to help you reach your goals faster.

PROGRESS TRACKING
Use the Progress tab to log your weight, set goals, and track your transformation journey. The AI Coach can review your progress and give recommendations.

CONTACT & SUPPORT
For any questions, visit the Contact tab or reach us directly through WhatsApp or phone. Our team is always ready to help.`;

const DEFAULT_QUICK_AR = `مرحباً بك في Platinum Gym!

- يجب تقديم بطاقة العضوية عند الدخول
- الالتزام بالزي الرياضي المناسب في جميع الأوقات
- إعادة الأوزان إلى أماكنها بعد الاستخدام
- احترام المعدات والأعضاء الآخرين
- قسم السيدات فقط: 11 صباحاً - 1 ظهراً يومياً
- الرجال والمختلط: 1 ظهراً - 2 صباحاً يومياً
- خزائن متاحة — أحضر قفلك الخاص
- التدريب الشخصي متاح — استفسر عند الاستقبال
- يجب حجز الحصص مسبقاً
- لا يسمح بالطعام داخل صالة التمرين
- التصوير بإذن فقط
- العضوية شخصية وغير قابلة للتحويل`;

const DEFAULT_DETAILED_AR = `مرحباً بك في Platinum Gym — دليلك الشامل للياقة البدنية

العضوية والدخول
عضويتك تمنحك وصولاً كاملاً لجميع مرافق الجيم خلال ساعات العمل. يرجى تقديم بطاقة العضوية أو عرض ملفك الشخصي في التطبيق عند المدخل. العضويات شخصية وغير قابلة للتحويل.

ساعات العمل
السيدات فقط: 11:00 صباحاً - 1:00 ظهراً يومياً
المختلط والرجال: 1:00 ظهراً - 2:00 صباحاً يومياً
استثناءات خاصة: السبت والاثنين والأربعاء — 6:00 مساءً إلى 8:00 مساءً للسيدات فقط

قواعد صالة التمرين
- أعد الأوزان دائماً إلى أماكنها بعد الاستخدام
- نظف المعدات بعد كل استخدام
- الزي الرياضي المناسب مطلوب في جميع الأوقات
- ممنوع الأحذية العادية على أرضية الجيم
- الحفاظ على مستوى صوت محترم

الحصص الجماعية
نقدم مجموعة متنوعة من حصص اللياقة الجماعية تشمل الأيروبيكس والجمباز والملاكمة والزومبا وغيرها. يجب حجز الحصص مسبقاً عبر التطبيق أو عند الاستقبال. تحقق من تبويب الحصص للاطلاع على الجدول الكامل.

التدريب الشخصي
مدربونا المعتمدون متاحون لجلسات التدريب الشخصي. زر تبويب المدربين للتعرف على فريقنا وحجز جلسة. يمكن للمساعد الذكي الإجابة على أسئلتك الرياضية على مدار الساعة.

دعم التغذية
احصل على خطط تغذية مخصصة من خلال تبويب التغذية في لوحة التحكم. أعد مدربونا قوالب لمساعدتك على تحقيق أهدافك بشكل أسرع.

تتبع التقدم
استخدم تبويب التقدم لتسجيل وزنك وتحديد أهدافك وتتبع رحلة تحولك. يمكن للمدرب الذكي مراجعة تقدمك وتقديم توصيات.

التواصل والدعم
لأي استفسارات، زر تبويب التواصل أو تواصل معنا مباشرة عبر واتساب أو الهاتف. فريقنا دائماً مستعد للمساعدة.`;

const TABS = [
  { key: "quickEn", label: "Quick EN" },
  { key: "detailedEn", label: "Detailed EN" },
  { key: "quickAr", label: "Quick AR" },
  { key: "detailedAr", label: "Detailed AR" },
];

export default function GuidelinesPage() {
  const [activeTab, setActiveTab] = useState("quickEn");
  const [form, setForm] = useState({
    quickEn: "",
    detailedEn: "",
    quickAr: "",
    detailedAr: "",
  });
  const [initial, setInitial] = useState({
    quickEn: "",
    detailedEn: "",
    quickAr: "",
    detailedAr: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchGuidelines = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "guidelines"));
        if (snap.exists()) {
          const data = snap.data();
          const vals = {
            quickEn: data.quickEn ?? DEFAULT_QUICK_EN,
            detailedEn: data.detailedEn ?? DEFAULT_DETAILED_EN,
            quickAr: data.quickAr ?? DEFAULT_QUICK_AR,
            detailedAr: data.detailedAr ?? DEFAULT_DETAILED_AR,
          };
          setForm(vals);
          setInitial(vals);
        } else {
          const defaults = {
            quickEn: DEFAULT_QUICK_EN,
            detailedEn: DEFAULT_DETAILED_EN,
            quickAr: DEFAULT_QUICK_AR,
            detailedAr: DEFAULT_DETAILED_AR,
          };
          setForm(defaults);
          setInitial(defaults);
        }
      } catch {
        const defaults = {
          quickEn: DEFAULT_QUICK_EN,
          detailedEn: DEFAULT_DETAILED_EN,
          quickAr: DEFAULT_QUICK_AR,
          detailedAr: DEFAULT_DETAILED_AR,
        };
        setForm(defaults);
        setInitial(defaults);
      } finally {
        setLoading(false);
      }
    };
    fetchGuidelines();
  }, []);

  const hasChanges =
    form.quickEn !== initial.quickEn ||
    form.detailedEn !== initial.detailedEn ||
    form.quickAr !== initial.quickAr ||
    form.detailedAr !== initial.detailedAr;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, "settings", "guidelines"), {
        quickEn: form.quickEn.trim(),
        detailedEn: form.detailedEn.trim(),
        quickAr: form.quickAr.trim(),
        detailedAr: form.detailedAr.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setInitial({ ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      console.log("Failed to save guidelines");
    } finally {
      setSaving(false);
    }
  };

  const tabContent = form[activeTab as keyof typeof form];
  const isRtl = activeTab === "quickAr" || activeTab === "detailedAr";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
          <BookOpen size={14} /> Member Guidelines
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          Gym <span className="text-purple-400">Guidelines</span>
        </h1>
        <p className="text-gray-400">Manage member guidelines in English and Arabic — quick and detailed versions.</p>
      </div>

      {/* Info box */}
      <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-5 mb-8">
        <p className="text-sm text-blue-300 leading-relaxed">
          These guidelines are displayed to <strong className="text-blue-200">all users</strong> in the app. The Quick version is shown as a concise list, while the Detailed version provides full context. Both English and Arabic versions are included for bilingual support.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={32} className="animate-spin text-purple-400 mx-auto" />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-gray-900 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <textarea
              value={tabContent}
              onChange={(e) => setForm({ ...form, [activeTab]: e.target.value.slice(0, MAX_CHARS) })}
              rows={18}
              dir={isRtl ? "rtl" : "ltr"}
              lang={isRtl ? "ar" : "en"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none mb-3"
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className={`text-xs font-mono ${tabContent.length >= MAX_CHARS ? "text-red-400" : "text-gray-500"}`}>
                {tabContent.length}/{MAX_CHARS}
              </span>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-xs text-green-400 flex items-center gap-1.5">
                    <CheckCircle size={14} /> Changes saved
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="bg-purple-500 hover:bg-purple-400 disabled:opacity-30 text-black font-bold px-6 py-3 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
