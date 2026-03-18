import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from '../../config/firebase'
import './DoctorRegister.css'

export default function DoctorRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', location: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [locations, setLocations] = useState([])
  const [locationCoords, setLocationCoords] = useState({ lat: null, lon: null })

  const showMsg = (text, type) => {
    setMessage({ text, type })
    if (type === 'error') setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const searchLocation = async (query) => {
    if (query.length < 3) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
        { headers: { 'User-Agent': 'VetSafeTracker/1.0' } }
      )
      const data = await response.json()
      setLocations(data)
    } catch (error) {
      console.error('Location search error:', error)
    }
  }

  const handleLocationChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, location: value })
    
    const selected = locations.find(l => l.display_name === value)
    if (selected) {
      setLocationCoords({ lat: selected.lat, lon: selected.lon })
    }
    
    const timer = setTimeout(() => searchLocation(value), 500)
    return () => clearTimeout(timer)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.location) {
      showMsg('Please enter your practice location.', 'error')
      return
    }

    if (formData.password.length < 6) {
      showMsg('Password must be at least 6 characters long.', 'error')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        location: formData.location,
        latitude: locationCoords.lat,
        longitude: locationCoords.lon,
        email: formData.email,
        role: 'doctor',
        verified: false,
        specialization: 'Veterinary Medicine',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      showMsg('✅ Registration Successful! Redirecting to login...', 'success')
      setTimeout(() => navigate('/doctor-login'), 2000)

    } catch (error) {
      console.error('Registration error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login or use a different email.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.'
      }
      showMsg(errorMessages[error.code] || `Error: ${error.message}` || 'Registration failed. Please try again.', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="register-body">
      <div className="register-container">
        <div className="header">
          <h1><span className="emoji">👨⚕️</span> Veterinary Doctor Registration</h1>
          <p>Join as a Veterinary Professional</p>
        </div>

        <div className="info-box">
          <strong>🩺 For Veterinary Professionals</strong>
          Register to provide veterinary services and connect with farmers in your area.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Dr. Your Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Practice Location</label>
            <input type="text" list="locations" placeholder="📍 Search your location" value={formData.location} onChange={handleLocationChange} required />
            <datalist id="locations">
              {locations.map((loc, i) => (
                <option key={i} value={loc.display_name} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="your.email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <button className="submit-btn" type="submit" disabled={loading}>
            <span>{loading ? 'Registering...' : 'Register as Doctor'}</span>
            {loading && <span className="spinner"></span>}
          </button>
        </form>

        {message.text && <div className={`message ${message.type} show`}>{message.text}</div>}

        <div className="login-link">
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/doctor-login'); }}>Login here</a>
        </div>
      </div>
    </div>
  )
}
