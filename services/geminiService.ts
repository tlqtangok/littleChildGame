import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData, getAudioContext, playAudioBuffer } from "./audioUtils";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateFriendlyExplanation = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      // Ask for explanation in Chinese
      contents: `用中文向5岁的小女孩解释"${topic}"。语气要非常神奇、兴奋且简单。少于40个字。使用表情符号！`,
    });
    return response.text || "出错了，我们再试一次！";
  } catch (error) {
    console.error("Text gen error:", error);
    return "哎呀！我的魔法棒累了。我们直接玩游戏吧！";
  }
};

export const speakText = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Kore works reasonably well for multi-lingual, or it will fallback to a default supported voice for the detected language
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const ctx = getAudioContext();
      // Resume context if suspended (browser policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      playAudioBuffer(audioBuffer);
    }
  } catch (error) {
    console.warn("Gemini TTS error (likely quota), switching to browser fallback:", error);
    
    // Fallback to native browser TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel any currently playing speech to prevent overlap during rapid clicks
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; // Set language to Chinese
      utterance.rate = 0.9; // Slightly slower for children
      utterance.pitch = 1.1; // Slightly friendlier pitch
      
      window.speechSynthesis.speak(utterance);
    }
  }
};

export const generateRewardSticker = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            // Keep prompt instructions in English for the model to follow style, but subject can be flexible
            text: `A cute, kawaii sticker for a 5-year-old girl. White background. Style: Cartoon vector art. Subject: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image gen error:", error);
    return null;
  }
};