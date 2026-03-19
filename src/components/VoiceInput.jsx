import React, { useState } from 'react';
import VoiceControls from './VoiceControls';

const VoiceInput = ({ 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  className = '',
  enableSpeak = true,
  enableListen = true,
  language = 'en-US',
  ...props 
}) => {
  const [inputValue, setInputValue] = useState(value || '');

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (onChange) {
      onChange(e);
    }
  };

  const handleSpeechResult = (transcript) => {
    const newValue = inputValue + (inputValue ? ' ' : '') + transcript;
    setInputValue(newValue);
    
    // Create synthetic event for onChange
    const syntheticEvent = {
      target: { value: newValue },
      currentTarget: { value: newValue }
    };
    
    if (onChange) {
      onChange(syntheticEvent);
    }
  };

  return (
    <div className="voice-input-container">
      <div className="input-with-voice">
        <input
          type={type}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`voice-enabled-input ${className}`}
          {...props}
        />
        <VoiceControls
          onSpeechResult={handleSpeechResult}
          textToSpeak={inputValue}
          showSpeakButton={enableSpeak && inputValue.length > 0}
          showListenButton={enableListen}
          language={language}
          className="input-voice-controls"
        />
      </div>
    </div>
  );
};

export default VoiceInput;