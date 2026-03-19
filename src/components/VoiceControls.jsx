import React, { useState, useEffect } from 'react';
import voiceService from '../services/voiceService';
import './VoiceControls.css';

const VoiceControls = ({ 
  onSpeechResult, 
  textToSpeak, 
  showSpeakButton = true, 
  showListenButton = true,
  language = 'en-US',
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const available = await voiceService.isAvailable();
      setIsAvailable(available);
    } catch (error) {
      console.error('Voice availability check failed:', error);
      setIsAvailable(false);
    }
  };

  const handleSpeak = async () => {
    if (!textToSpeak) return;
    
    try {
      setError('');
      setIsSpeaking(true);
      await voiceService.speak(textToSpeak, { lang: language });
    } catch (error) {
      setError('Speech failed: ' + error.message);
      console.error('Speak error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleStopSpeaking = async () => {
    try {
      await voiceService.stopSpeaking();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  };

  const handleListen = async () => {
    try {
      setError('');
      setIsListening(true);
      
      const result = await voiceService.startListening({
        language: language,
        prompt: 'Speak now...',
        partialResults: true
      });
      
      if (result && result.matches && result.matches.length > 0) {
        const transcript = result.matches[0];
        if (onSpeechResult) {
          onSpeechResult(transcript);
        }
      }
    } catch (error) {
      setError('Speech recognition failed: ' + error.message);
      console.error('Listen error:', error);
    } finally {
      setIsListening(false);
    }
  };

  const handleStopListening = async () => {
    try {
      await voiceService.stopListening();
      setIsListening(false);
    } catch (error) {
      console.error('Stop listening error:', error);
    }
  };

  if (!isAvailable) {
    return (
      <div className={`voice-controls unavailable ${className}`}>
        <span className="voice-status">Voice features not supported</span>
      </div>
    );
  }

  return (
    <div className={`voice-controls ${className}`}>
      {showSpeakButton && (
        <button
          className={`voice-btn speak-btn ${isSpeaking ? 'active' : ''}`}
          onClick={isSpeaking ? handleStopSpeaking : handleSpeak}
          disabled={!textToSpeak}
          title={isSpeaking ? 'Stop Speaking' : 'Speak Text'}
        >
          {isSpeaking ? (
            <>
              <span className="voice-icon">🔊</span>
              <span>Stop</span>
            </>
          ) : (
            <>
              <span className="voice-icon">🔊</span>
              <span>Speak</span>
            </>
          )}
        </button>
      )}

      {showListenButton && (
        <button
          className={`voice-btn listen-btn ${isListening ? 'active' : ''}`}
          onClick={isListening ? handleStopListening : handleListen}
          title={isListening ? 'Stop Listening' : 'Start Voice Input'}
        >
          {isListening ? (
            <>
              <span className="voice-icon recording">🎤</span>
              <span>Stop</span>
            </>
          ) : (
            <>
              <span className="voice-icon">🎤</span>
              <span>Listen</span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}

      {(isListening || isSpeaking) && (
        <div className="voice-status">
          {isListening && <span>🎤 Listening...</span>}
          {isSpeaking && <span>🔊 Speaking...</span>}
        </div>
      )}
    </div>
  );
};

export default VoiceControls;