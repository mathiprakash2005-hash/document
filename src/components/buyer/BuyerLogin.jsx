import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, doc, getDoc, signOut } from '../../config/firebase'
import './BuyerLogin.css'

export default function BuyerLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showMsg = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cleanEmail = formData.email.trim().replace(/^mailto:/i, '')
      console.log('EMAIL:', cleanEmail)
      console.log('PASSWORD:', formData.password)
      const result = await signInWithEmailAndPassword(auth, cleanEmail, formData.password)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (userDoc.exists() && userDoc.data().role === 'buyer') {
        showMsg('Login successful! Redirecting...', 'success')
        setTimeout(() => navigate('/buyer-dashboard'), 1500)
      } else {
        await signOut(auth)
        showMsg('This account is not registered as a buyer. Please use the correct login page.', 'error')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      console.error('Error code:', err.code)
      console.error('Error message:', err.message)
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-login-credentials': 'Invalid email or password. If you signed up with Google, use "Continue with Google" button or reset your password.',
        'auth/invalid-credential': 'Invalid email or password. If you signed up with Google, use "Continue with Google" button or reset your password.',
        'auth/invalid-email': 'Invalid email address format',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later'
      }
      showMsg(errorMessages[err.code] || 'Login failed. Please try again.', 'error')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    setLoading(true)
    
    try {
      const result = await signInWithPopup(auth, provider)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (userDoc.exists()) {
        if (userDoc.data().role === 'buyer') {
          showMsg('Login successful! Redirecting...', 'success')
          setTimeout(() => navigate('/buyer-dashboard'), 1500)
        } else {
          await signOut(auth)
          showMsg('This Google account is not registered as a buyer. Please register first.', 'error')
          setTimeout(() => navigate('/buyer-register'), 2000)
          setLoading(false)
        }
      } else {
        await signOut(auth)
        showMsg('Account not found. Please register first.', 'error')
        setTimeout(() => navigate('/buyer-register'), 2000)
      }
    } catch (err) {
      const errorMessages = {
        'auth/popup-closed-by-user': 'Sign-in cancelled',
        'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups'
      }
      showMsg(errorMessages[err.code] || err.message, 'error')
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cleanEmail = resetEmail.trim().replace(/^mailto:/i, '')
      await sendPasswordResetEmail(auth, cleanEmail)
      showMsg('Password reset link sent to your email!', 'success')
      setTimeout(() => {
        setShowReset(false)
        setLoading(false)
      }, 3000)
    } catch (err) {
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email address',
        'auth/invalid-email': 'Invalid email address format'
      }
      showMsg(errorMessages[err.code] || err.message, 'error')
      setLoading(false)
    }
  }

  return (
    <div className="buyer-login-body">
      <div className="login-container">
        {!showReset ? (
          <>
            <div className="header">
              <h1><span className="emoji">🛒</span> Welcome Back, Buyer!</h1>
              <p>Sign in to VetSafe Tracker</p>
            </div>

            {message.text && <div className={`message ${message.type} show`}>{message.text}</div>}

            <button className="google-btn" onClick={handleGoogleSignIn} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="divider">OR</div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="buyer@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                  <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</span>
                </div>
              </div>

              <div className="forgot-password">
                <a href="#" onClick={(e) => { e.preventDefault(); setShowReset(true); }}>Forgot Password?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
            </form>

            <div className="register-link">
              New Buyer? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/buyer-register'); }}>Register here</a>
            </div>
          </>
        ) : (
          <>
            <div className="header">
              <h1><span className="emoji">🔐</span> Reset Password</h1>
              <p>Enter your email to receive a password reset link</p>
            </div>

            {message.text && <div className={`message ${message.type} show`}>{message.text}</div>}

            <form onSubmit={handleReset}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="buyer@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
              </div>

              <button type="button" className="submit-btn" style={{background: '#f0f0f0', color: '#333', marginBottom: '15px'}} onClick={() => { setShowReset(false); setLoading(false); }} disabled={loading}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
