import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signInWithEmailAndPassword, signOut, doc, getDoc, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from '../../config/firebase'
import './FarmerLogin.css'

function FarmerLogin() {
  const navigate = useNavigate()
  const [showReset, setShowReset] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [resetEmail, setResetEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    console.log('Attempting login with:', formData.email)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      console.log('Login successful:', userCredential.user.uid)
      navigate('/farmer-dashboard')
    } catch (err) {
      console.error('Login error details:', {
        code: err.code,
        message: err.message,
        email: formData.email
      })
      
      const errorMessages = {
        'auth/user-not-found': 'User not registered. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-login-credentials': 'Invalid email or password. Please check your credentials.',
        'auth/invalid-email': 'Invalid email format.',
        'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
        'auth/too-many-requests': 'Too many failed attempts. Try again later.',
        'auth/user-disabled': 'This account has been disabled.'
      }
      setError(errorMessages[err.code] || `Login failed: ${err.message}`)
    }
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    
    try {
      const result = await signInWithPopup(auth, provider)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.role === 'farmer') {
          navigate('/farmer-dashboard')
        } else {
          await signOut(auth)
          setError('This account is not registered as a farmer. Please register first.')
        }
      } else {
        await signOut(auth)
        setError('Account not found. Please register first.')
        setTimeout(() => navigate('/farmer-register'), 2000)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setSuccess('Password reset link sent to your email!')
      setTimeout(() => setShowReset(false), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="farmer-login-wrapper">
      <div className="farmer-login-container">
        {!showReset ? (
          <>
            <div className="farmer-login-header">
              <h1><span className="farmer-login-emoji">🌾</span> Welcome Back, Farmer!</h1>
              <p>Sign in to VetSafe Tracker</p>
            </div>

            {error && <div className="farmer-login-error-message show">{error}</div>}

            <button className="farmer-login-google-btn" onClick={handleGoogleSignIn}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
              </svg>
              Continue with Google
            </button>

            <div className="farmer-login-divider">OR</div>

            <form onSubmit={handleLogin}>
              <div className="farmer-login-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="farmer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="farmer-login-form-group">
                <label htmlFor="password">Password</label>
                <div className="farmer-login-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <span className="farmer-login-toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    👁️
                  </span>
                </div>
              </div>

              <div className="farmer-login-forgot-password">
                <a onClick={() => setShowReset(true)}>Forgot Password?</a>
              </div>

              <button type="submit" className="farmer-login-submit-btn">Login</button>
            </form>

            <div className="farmer-login-register-link">
              New Farmer? <a onClick={() => navigate('/farmer-register')}>Register here</a>
            </div>
          </>
        ) : (
          <>
            <div className="farmer-login-header">
              <h1><span className="farmer-login-emoji">🔐</span> Reset Password</h1>
              <p>Enter your email to receive a password reset link</p>
            </div>

            {error && <div className="farmer-login-error-message show">{error}</div>}
            {success && <div className="farmer-login-success-message show">{success}</div>}

            <form onSubmit={handleReset}>
              <div className="farmer-login-form-group">
                <label htmlFor="resetEmail">Email Address</label>
                <input
                  type="email"
                  id="resetEmail"
                  placeholder="farmer@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <button type="button" className="farmer-login-submit-btn farmer-login-back-btn" onClick={() => setShowReset(false)}>
                Cancel
              </button>
              <button type="submit" className="farmer-login-submit-btn">Send Reset Link</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default FarmerLogin
