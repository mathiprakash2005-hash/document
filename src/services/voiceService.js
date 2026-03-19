import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

class VoiceService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
  }

  // Text to Speech
  async speak(text, options = {}) {
    try {
      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      this.isSpeaking = true;
      
      const speakOptions = {
        text: text,
        lang: options.lang || 'en-US',
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        category: 'ambient',
        ...options
      };

      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.speak(speakOptions);
      } else {
        // Web fallback
        this.webSpeak(text, speakOptions);
      }
      
      this.isSpeaking = false;
    } catch (error) {
      this.isSpeaking = false;
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  async stopSpeaking() {
    try {
      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.stop();
      } else {
        window.speechSynthesis.cancel();
      }
      this.isSpeaking = false;
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  }

  // Web Speech API fallback
  webSpeak(text, options) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'en-US';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      
      window.speechSynthesis.speak(utterance);
    }
  }

  // Speech Recognition
  async startListening(options = {}) {
    try {
      if (this.isListening) {
        return;
      }

      // Request permissions first
      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== 'granted') {
        throw new Error('Speech recognition permission denied');
      }

      this.isListening = true;

      const listenOptions = {
        language: options.language || 'en-US',
        maxResults: options.maxResults || 5,
        prompt: options.prompt || 'Say something...',
        partialResults: options.partialResults || true,
        popup: options.popup || false,
        ...options
      };

      if (Capacitor.isNativePlatform()) {
        const result = await SpeechRecognition.start(listenOptions);
        this.isListening = false;
        return result;
      } else {
        // Web fallback
        return await this.webListen(listenOptions);
      }
    } catch (error) {
      this.isListening = false;
      console.error('Speech recognition error:', error);
      throw error;
    }
  }

  async stopListening() {
    try {
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
      }
      this.isListening = false;
    } catch (error) {
      console.error('Stop listening error:', error);
    }
  }

  // Web Speech Recognition fallback
  webListen(options) {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = options.language || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = options.partialResults || false;
      recognition.maxAlternatives = options.maxResults || 1;

      recognition.onresult = (event) => {
        const results = [];
        for (let i = 0; i < event.results.length; i++) {
          results.push(event.results[i][0].transcript);
        }
        this.isListening = false;
        resolve({ matches: results });
      };

      recognition.onerror = (event) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        this.isListening = false;
      };

      recognition.start();
    });
  }

  // Check if voice features are available
  async isAvailable() {
    try {
      if (Capacitor.isNativePlatform()) {
        const available = await SpeechRecognition.available();
        return available.available;
      } else {
        return 'speechSynthesis' in window && 
               ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
      }
    } catch (error) {
      return false;
    }
  }

  // Get supported languages
  async getSupportedLanguages() {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await SpeechRecognition.getSupportedLanguages();
        return result.languages;
      } else {
        // Return common languages for web
        return ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN'];
      }
    } catch (error) {
      return ['en-US'];
    }
  }

  // Check current status
  getStatus() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking
    };
  }
}

export default new VoiceService();