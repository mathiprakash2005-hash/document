import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, doc, getDoc, setDoc, serverTimestamp } from '../../config/firebase'
import './DoctorLogin.css'

export default function DoctorLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState({ email: false, google: false, reset: false })
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showModal, setShowModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [modalMessage, setModalMessage] = useState({ text: '', type: '' })

  const showMsg = (text, type, isModal = false) => {
    if (isModal) {
      setModalMessage({ text, type })
      if (type === 'success') setTimeout(() => setModalMessage({ text: '', type: '' }), 5000)
    } else {
      setMessage({ text, type })
      setTimeout(() => setMessage({ text: '', type: '' }), 5000)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading({ ...loading, email: true })

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
      
      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        showMsg('Login successful! Redirecting...', 'success')
        setTimeout(() => navigate('/doctor-dashboard'), 1500)
      } else {
        await auth.signOut()
        showMsg('This account is not registered as a doctor. Please use the correct login page.', 'error')
        setLoading({ ...loading, email: false })
      }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email. Please register first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password. Please check your credentials.'
      }
      showMsg(errorMessages[error.code] || error.message || 'Login failed. Please try again.', 'error')
      setLoading({ ...loading, email: false })
    }
  }

  const handleGoogleLogin = async () => {
    setLoading({ ...loading, google: true })

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))

      if (userDoc.exists()) {
        if (userDoc.data().role === 'doctor') {
          showMsg('Login successful! Redirecting...', 'success')
          setTimeout(() => navigate('/doctor-dashboard'), 1500)
        } else {
          await auth.signOut()
          showMsg('This Google account is not registered as a doctor. Please use the correct login page.', 'error')
          setLoading({ ...loading, google: false })
        }
      } else {
        await setDoc(doc(db, 'users', result.user.uid), {
          name: result.user.displayName || 'Doctor',
          email: result.user.email,
          role: 'doctor',
          verified: false,
          specialization: 'Veterinary Medicine',
          photoURL: result.user.photoURL || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        showMsg('Account created! Redirecting...', 'success')
        setTimeout(() => navigate('/doctor-dashboard'), 1500)
      }
    } catch (error) {
      const errorMessages = {
        'auth/popup-closed-by-user': 'Sign-in cancelled.',
        'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site.'
      }
      showMsg(errorMessages[error.code] || error.message || 'Google sign-in failed. Please try again.', 'error')
      setLoading({ ...loading, google: false })
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      showMsg('Please enter your email address.', 'error', true)
      return
    }

    setLoading({ ...loading, reset: true })

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      showMsg('Password reset link sent! Check your email.', 'success', true)
      setTimeout(() => {
        setShowModal(false)
        setLoading({ ...loading, reset: false })
      }, 3000)
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/invalid-email': 'Invalid email address format.'
      }
      showMsg(errorMessages[error.code] || error.message || 'Failed to send reset email. Please try again.', 'error', true)
      setLoading({ ...loading, reset: false })
    }
  }

  return (
    <div className="doctor-login-body">
      <div className="login-container">
        <div className="header">
          <h1><span className="emoji">👨⚕️</span> Welcome Back, Doctor!</h1>
          <p>Sign in to VetSafe Tracker</p>
        </div>

        {message.text && <div className={`message ${message.type} show`}>{message.text}</div>}

        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading.google}>
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{loading.google ? 'Signing in...' : 'Continue with Google'}</span>
          {loading.google && <span className="spinner"></span>}
        </button>

        <div className="divider">OR</div>

        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="doctor@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <div className="forgot-password">
            <a href="#" onClick={(e) => { e.preventDefault(); setShowModal(true); }}>Forgot Password?</a>
          </div>

          <button className="login-btn" type="submit" disabled={loading.email}>
            <span>{loading.email ? 'Signing in...' : 'Login'}</span>
            {loading.email && <span className="spinner"></span>}
          </button>
        </form>

        <div className="register-link">
          New Doctor? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/doctor-register'); }}>Register here</a>
        </div>
      </div>

      {showModal && (
        <div className="modal show" onClick={(e) => e.target.className.includes('modal') && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>🔐 Reset Password</h3>
              <p>Enter your email to receive a password reset link</p>
            </div>

            {modalMessage.text && <div className={`message ${modalMessage.type} show`}>{modalMessage.text}</div>}

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="doctor@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
            </div>

            <div className="modal-buttons">
              <button className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handlePasswordReset} disabled={loading.reset}>
                <span>{loading.reset ? 'Sending...' : 'Send Reset Link'}</span>
                {loading.reset && <span className="spinner"></span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
