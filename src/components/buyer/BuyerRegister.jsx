import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from '../../config/firebase'
import './BuyerRegister.css'

export default function BuyerRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', location: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [locations, setLocations] = useState([])
  const [coords, setCoords] = useState({ lat: null, lon: null })
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showMsg = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const handleLocationSearch = async (query) => {
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

  const handleLocationSelect = (place) => {
    setFormData({ ...formData, location: place.display_name })
    setCoords({ lat: place.lat, lon: place.lon })
    setLocations([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (formData.password.length < 6) {
      showMsg('Password must be at least 6 characters long.', 'error')
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password)
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        location: formData.location,
        latitude: coords.lat,
        longitude: coords.lon,
        email: formData.email.trim(),
        role: 'buyer',
        businessType: 'Livestock Buyer',
        verified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      showMsg('✅ Registration Successful! Redirecting to login...', 'success')
      setTimeout(() => navigate('/buyer-login'), 2000)
    } catch (error) {
      console.error('Registration error:', error)
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login or use a different email.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.'
      }
      showMsg(errorMessages[error.code] || error.message, 'error')
      setLoading(false)
    }
  }

  let debounceTimer
  const handleLocationInput = (value) => {
    setFormData({ ...formData, location: value })
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => handleLocationSearch(value), 500)
  }

  return (
    <div className="buyer-register-body">
      <div className="register-container">
        <div className="header">
          <div className="header-icon">🛒</div>
          <h2>Buyer Registration</h2>
          <p className="subtitle">Join as a Livestock Buyer</p>
        </div>

        <div className="info-box">
          <strong>🥩 For Meat & Livestock Buyers</strong>
          Register to access quality livestock products and connect with verified farmers.
        </div>

        {message.text && <div className={`message ${message.type} show`}>{message.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Enter your full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Business Location</label>
            <input type="text" placeholder="📍 Search your location" value={formData.location} onChange={(e) => handleLocationInput(e.target.value)} required />
            {locations.length > 0 && (
              <div className="location-dropdown">
                {locations.map((place, idx) => (
                  <div key={idx} className="location-item" onClick={() => handleLocationSelect(place)}>
                    {place.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="your.email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register as Buyer'}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/buyer-login'); }}>Login here</a>
        </div>
      </div>
    </div>
  )
}
