import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from '../../config/firebase'
import './FarmerRegister.css'

function FarmerRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    email: '',
    password: '',
    farmTypes: []
  })
  const [showPassword, setShowPassword] = useState(false)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({
      ...prev,
      farmTypes: e.target.checked 
        ? [...prev.farmTypes, value]
        : prev.farmTypes.filter(type => type !== value)
    }))
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
    } catch (err) {
      console.error('Location search error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.farmTypes.length === 0) {
      setError('Please select at least one farm type.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        location: formData.location,
        email: formData.email,
        role: 'farmer',
        farmTypes: formData.farmTypes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      setSuccess('✅ Registration Successful! Redirecting to login...')
      setTimeout(() => navigate('/farmer-login'), 2000)
    } catch (err) {
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/weak-password': 'Password is too weak.',
        'auth/network-request-failed': 'Network error. Check your connection.'
      }
      setError(errorMessages[err.code] || err.message)
      setLoading(false)
    }
  }

  return (
    <div className="register-wrapper">
      <div className="container">
        <div className="header">
          <div className="header-icon">🌾</div>
          <h2>Farmer Registration</h2>
          <p className="subtitle">Join VetSafe Tracker Community</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              placeholder="📍 Search your location"
              value={formData.location}
              onChange={(e) => {
                handleInputChange(e)
                searchLocation(e.target.value)
              }}
              list="locations"
              required
            />
            <datalist id="locations">
              {locations.map((loc, idx) => (
                <option key={idx} value={loc.display_name} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="6"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="checkbox-group">
            <strong>🐄 Select Your Farm Type(s):</strong>

            {[
              { id: 'dairy', value: 'Dairy', icon: '🐄', label: 'Dairy (பால் மாடு)' },
              { id: 'goat', value: 'Goat/Sheep', icon: '🐐', label: 'Goat/Sheep (ஆடு/செம்மறி)' },
              { id: 'poultry', value: 'Poultry', icon: '🐔', label: 'Poultry (கோழி)' },
              { id: 'pig', value: 'Pig', icon: '🐷', label: 'Pig (பன்றி)' },
              { id: 'buffalo', value: 'Buffalo', icon: '🐃', label: 'Buffalo (எருமை)' }
            ].map(farm => (
              <div className="checkbox-item" key={farm.id}>
                <input
                  type="checkbox"
                  id={farm.id}
                  value={farm.value}
                  checked={formData.farmTypes.includes(farm.value)}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor={farm.id}>
                  <span className="checkbox-icon">{farm.icon}</span>
                  <span>{farm.label}</span>
                </label>
              </div>
            ))}
          </div>

          <button className="button" type="submit" disabled={loading}>
            <div className="button-content">
              <span>{loading ? 'Registering...' : 'Register Farmer'}</span>
              {loading && <span className="spinner"></span>}
            </div>
          </button>
        </form>

        {error && <div className="message error show">{error}</div>}
        {success && <div className="message success show">{success}</div>}

        <div className="login-link">
          Already have an account? <a onClick={() => navigate('/farmer-login')}>Login here</a>
        </div>
      </div>
    </div>
  )
}

export default FarmerRegister
