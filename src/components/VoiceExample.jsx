import React, { useState } from 'react';
import VoiceControls from './VoiceControls';
import VoiceInput from './VoiceInput';
import voiceService from '../services/voiceService';

const VoiceExample = () => {
  const [notes, setNotes] = useState('');
  const [animalName, setAnimalName] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleAnimalNameChange = (e) => {
    setAnimalName(e.target.value);
  };

  const handleSymptomsChange = (e) => {
    setSymptoms(e.target.value);
  };

  const speakInstructions = async () => {
    const instructions = "Welcome to VetSafe Tracker. You can use voice commands to add animal information, record symptoms, and take notes. Click the microphone button to start voice input, or the speaker button to hear text read aloud.";
    await voiceService.speak(instructions);
  };

  return (
    <div className="voice-example" style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Voice Features Demo</h2>
      
      <div className="demo-section">
        <h3>Instructions</h3>
        <p>This app now supports voice input and text-to-speech!</p>
        <VoiceControls 
          textToSpeak="Welcome to VetSafe Tracker. You can use voice commands to add animal information."
          showListenButton={false}
        />
        <button onClick={speakInstructions} style={{ marginLeft: '10px', padding: '8px 16px' }}>
          Speak Instructions
        </button>
      </div>

      <div className="demo-section" style={{ marginTop: '30px' }}>
        <h3>Voice-Enabled Forms</h3>
        
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Animal Name:</label>
          <VoiceInput
            value={animalName}
            onChange={handleAnimalNameChange}
            placeholder="Enter or speak animal name"
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Symptoms:</label>
          <VoiceInput
            value={symptoms}
            onChange={handleSymptomsChange}
            placeholder="Describe symptoms using voice or text"
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Notes:</label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add notes here..."
            rows={4}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
          <VoiceControls
            onSpeechResult={(transcript) => {
              setNotes(prev => prev + (prev ? ' ' : '') + transcript);
            }}
            textToSpeak={notes}
            showSpeakButton={notes.length > 0}
          />
        </div>
      </div>

      <div className="demo-section" style={{ marginTop: '30px' }}>
        <h3>Current Values</h3>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <p><strong>Animal Name:</strong> {animalName || 'Not set'}</p>
          <p><strong>Symptoms:</strong> {symptoms || 'Not set'}</p>
          <p><strong>Notes:</strong> {notes || 'Not set'}</p>
        </div>
      </div>

      <div className="demo-section" style={{ marginTop: '30px' }}>
        <h3>Voice Commands Tips</h3>
        <ul>
          <li>Click 🎤 to start voice input</li>
          <li>Click 🔊 to hear text read aloud</li>
          <li>Speak clearly and wait for the beep</li>
          <li>Voice input will be added to existing text</li>
          <li>Works offline on mobile devices</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceExample;