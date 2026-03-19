import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from '../../config/firebase'
import { notifyNewConsultationRequest } from '../../services/notificationService'
import './DoctorConsultation.css'

function DoctorConsultation() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [animals, setAnimals] = useState([])
  const [formData, setFormData] = useState({ animalId: '', urgency: '', symptoms: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      
      // Support multiple languages including Tamil
      recognitionRef.current.lang = 'ta-IN' // Default to Tamil
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setFormData(prev => ({
          ...prev,
          symptoms: prev.symptoms + (prev.symptoms ? ' ' : '') + transcript
        }))
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        loadAnimals(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (farmerId) => {
    const q = query(collection(db, 'animals'), where('farmerId', '==', farmerId))
    const snapshot = await getDocs(q)
    setAnimals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  }

  const toggleVoiceInput = (language) => {
    if (!recognitionRef.current) {
      alert('Voice recognition not supported in your browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.lang = language
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Submitting consultation request:', {
        farmerId: user.uid,
        animalId: formData.animalId,
        urgency: formData.urgency,
        symptoms: formData.symptoms,
        status: 'pending'
      })

      const docRef = await addDoc(collection(db, 'consultationRequests'), {
        farmerId: user.uid,
        animalId: formData.animalId,
        urgency: formData.urgency,
        symptoms: formData.symptoms,
        status: 'pending',
        createdAt: serverTimestamp()
      })

      console.log('Request submitted successfully with ID:', docRef.id)
      
      // Notify all doctors
      const doctorsQuery = query(collection(db, 'users'), where('role', '==', 'doctor'))
      const doctorsSnapshot = await getDocs(doctorsQuery)
      
      const farmerDoc = await getDoc(doc(db, 'users', user.uid))
      const farmerName = farmerDoc.exists() ? farmerDoc.data().name : 'Farmer'
      
      for (const doctorDoc of doctorsSnapshot.docs) {
        await notifyNewConsultationRequest(doctorDoc.id, farmerName, formData.animalId)
      }
      
      setSuccess(true)
      setFormData({ animalId: '', urgency: '', symptoms: '' })
      setTimeout(() => {
        navigate('/farmer-dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Error submitting request: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="consult-container">
      <div className="page-header">
        <h1 className="page-title">Doctor Consultation</h1>
        <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
      </div>

      <div className="consult-card">
        <h2 className="card-title">
          <i className="fas fa-user-md"></i>
          Request Veterinary Consultation / கால்நடை மருத்துவர் ஆலோசனை கோரிக்கை
        </h2>

        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            Consultation request submitted successfully! / ஆலோசனை கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Animal / விலங்கைத் தேர்ந்தெடுக்கவும்</label>
            <select 
              className="form-select" 
              value={formData.animalId} 
              onChange={(e) => setFormData({...formData, animalId: e.target.value})} 
              required
            >
              <option value="">Choose an animal / விலங்கைத் தேர்ந்தெடுக்கவும்</option>
              {animals.map(a => (
                <option key={a.id} value={a.animalId}>
                  {a.speciesDisplay} - #{a.animalId}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Urgency Level / அவசர நிலை</label>
            <select 
              className="form-select" 
              value={formData.urgency} 
              onChange={(e) => setFormData({...formData, urgency: e.target.value})} 
              required
            >
              <option value="">Select urgency / அவசரத்தைத் தேர்ந்தெடுக்கவும்</option>
              <option value="Low">Low - Routine checkup / குறைவு - வழக்கமான பரிசோதனை</option>
              <option value="Medium">Medium - Needs attention / நடுத்தர - கவனம் தேவை</option>
              <option value="High">High - Urgent care needed / அதிகம் - அவசர சிகிச்சை தேவை</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Symptoms / Description / அறிகுறிகள் / விளக்கம்
              <span className="voice-badge">🎤 Voice Enabled / குரல் இயக்கப்பட்டது</span>
            </label>
            <div className="textarea-wrapper">
              <textarea 
                className="form-textarea" 
                value={formData.symptoms} 
                onChange={(e) => setFormData({...formData, symptoms: e.target.value})} 
                placeholder="Describe the symptoms or reason for consultation... / அறிகுறிகள் அல்லது ஆலோசனைக்கான காரணத்தை விவரிக்கவும்..."
                rows="5"
                required
              />
              <div className="voice-controls">
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => toggleVoiceInput('ta-IN')}
                  title="Speak in Tamil"
                >
                  <i className="fas fa-microphone"></i>
                  <span>தமிழ்</span>
                </button>
                <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => toggleVoiceInput('en-IN')}
                  title="Speak in English"
                >
                  <i className="fas fa-microphone"></i>
                  <span>English</span>
                </button>
                {/* <button
                  type="button"
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={() => toggleVoiceInput('hi-IN')}
                  title="Speak in Hindi"
                >
                  <i className="fas fa-microphone"></i>
                  <span>हिंदी</span>
                </button> */}
              </div>
              {isListening && (
                <div className="listening-indicator">
                  <span className="pulse"></span>
                  Listening... Speak now / கேட்கிறது... இப்போது பேசுங்கள்
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            <i className="fas fa-paper-plane"></i>
            {loading ? 'Submitting... / சமர்ப்பிக்கிறது...' : 'Submit Request / கோரிக்கையை சமர்ப்பிக்கவும்'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default DoctorConsultation
