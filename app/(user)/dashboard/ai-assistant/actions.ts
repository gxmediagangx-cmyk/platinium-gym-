"use server";

import { askAI, buildUserSystemPrompt, ChatMessage } from "@/lib/gemini";

const FB_PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID!;
const FB_BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

async function fbGet(path: string, idToken?: string): Promise<Record<string, any> | null> {
  try {
    const headers: Record<string, string> = {};
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${FB_BASE}/${path}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.fields ?? null;
  } catch { return null; }
}

async function fbList(col: string, idToken?: string): Promise<Array<Record<string, any>>> {
  try {
    const headers: Record<string, string> = {};
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${FB_BASE}/${col}`, { headers });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.documents ?? []).map((d: any) => d?.fields ?? {});
  } catch { return []; }
}

function fbStr(fields: Record<string, any>, key: string): string {
  const f = fields?.[key];
  return f?.stringValue ?? f?.integerValue?.toString() ?? '';
}

function fbBool(fields: Record<string, any>, key: string, def = true): boolean {
  const f = fields?.[key];
  if (f?.booleanValue !== undefined) return f.booleanValue;
  return def;
}

function fbNum(fields: Record<string, any>, key: string, def = 0): number {
  const f = fields?.[key];
  return Number(f?.integerValue ?? f?.doubleValue ?? def);
}

async function fbUpdate(path: string, idToken: string, fields: Record<string, any>): Promise<void> {
  try {
    const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    await fetch(`${FB_BASE}/${path}?${mask}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    });
  } catch { /* silent - chat save failure shouldn't crash the AI response */ }
}

export async function submitAIMessage(
  message: string,
  history: ChatMessage[],
  userProfile?: {
    name?: string;
    age?: number;
    weight?: number;
    height?: number;
    goal?: string;
  },
  options?: {
    languageMode?: string;
    responseStyle?: string;
    memories?: string[];
    chatId?: string;
    uid?: string;
    idToken?: string;
    isSystemMessage?: boolean;
  }
) {
  try {
    if (!options?.isSystemMessage && message.length > 4000) {
      return { success: false, error: 'Message too long. Please keep under 4000 characters.' };
    }
    console.log(`[AI ACTION START] chatId=${options?.chatId} time=${new Date().toISOString()}`);
    let coachKnowledge = "Welcome to Platinum Gym! Our coaches are here to help.";
    try {
      const knowledgeDocs = await fbList('coach_knowledge', options?.idToken);
      const knowledgeText = knowledgeDocs.slice(0, 5).map(f => fbStr(f, 'content')).filter(Boolean).join('\n');
      if (knowledgeText) coachKnowledge = knowledgeText;
    } catch (e) {
      console.log("Could not fetch knowledge", e);
    }

    let globalInstructions = "";
    try {
      const memoriesDocs = await fbList('aiGlobalMemories', options?.idToken);
      const activeMemories = memoriesDocs
        .map(f => ({ text: fbStr(f, 'text'), isActive: fbBool(f, 'isActive', true), order: fbNum(f, 'order', 0) }))
        .filter(m => m.isActive)
        .sort((a, b) => a.order - b.order)
        .map(m => m.text)
        .filter(Boolean)
        .join('\n\n');
      if (activeMemories) globalInstructions = activeMemories;
    } catch (e) {
      console.log("Could not fetch global instructions", e);
    }

    try {
      const gFields = await fbGet('settings/guidelines', options?.idToken);
      if (gFields) {
        const guidelinesText = [
          fbStr(gFields, 'detailedEn') ? `=== GYM GUIDELINES (English) ===\n${fbStr(gFields, 'detailedEn')}` : '',
          fbStr(gFields, 'detailedAr') ? `=== إرشادات الجيم (عربي) ===\n${fbStr(gFields, 'detailedAr')}` : '',
        ].filter(Boolean).join('\n\n');
        if (guidelinesText) globalInstructions = [globalInstructions, guidelinesText].filter(Boolean).join('\n\n');
      }
    } catch (e) {
      console.log("Could not fetch guidelines", e);
    }

    const profile = {
      name: userProfile?.name || "Gym Member",
      age: userProfile?.age,
      weight: userProfile?.weight,
      height: userProfile?.height,
      goal: userProfile?.goal || "General Fitness",
    };

    const systemPrompt = buildUserSystemPrompt(coachKnowledge, profile, { ...options, globalInstructions });
    const result = await askAI(message, systemPrompt, history);
    console.log(`[AI ACTION] askAI completed, got result, time=${new Date().toISOString()}`);

    if (options?.chatId && options?.uid && options?.idToken) {
      try {
        const historyForStore = history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          content: m.content,
        }));
        const msgs = [
          ...historyForStore,
          { role: "user", content: message },
          { role: "model", content: result.text },
        ];
        await fbUpdate(
          `users/${options.uid}/aiChats/${options.chatId}`,
          options.idToken,
          {
            messages: {
              arrayValue: {
                values: msgs.map(m => ({
                  mapValue: {
                    fields: {
                      role: { stringValue: m.role },
                      content: { stringValue: m.content },
                    }
                  }
                }))
              }
            },
            lastActivity: { timestampValue: new Date().toISOString() },
          }
        );
        console.log(`[AI ACTION END - SUCCESS] Firestore write completed, time=${new Date().toISOString()}`);
      } catch (e) {
        console.log("Failed to save AI response to Firestore", e);
      }
    }

    return {
      success: true,
      text: result.text,
      model: result.model,
    };
  } catch (error: any) {
    console.log(`[AI ACTION ERROR] error occurred, time=${new Date().toISOString()}, message=${error?.message}`);
    console.error("AI Error:", error);

    if (options?.chatId && options?.uid && options?.idToken) {
      try {
        const historyForStore = history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          content: m.content,
        }));
        const msgs = [
          ...historyForStore,
          { role: "user", content: message },
          { role: "model", content: "Sorry, I had trouble responding. Please try again." },
        ];
        await fbUpdate(
          `users/${options.uid}/aiChats/${options.chatId}`,
          options.idToken,
          {
            messages: {
              arrayValue: {
                values: msgs.map(m => ({
                  mapValue: {
                    fields: {
                      role: { stringValue: m.role },
                      content: { stringValue: m.content },
                    }
                  }
                }))
              }
            },
            lastActivity: { timestampValue: new Date().toISOString() },
          }
        );
      } catch (e) {
        console.log("Failed to save error to Firestore", e);
      }
    }

    return {
      success: false,
      error: error.message || "Failed to get AI response",
    };
  }
}