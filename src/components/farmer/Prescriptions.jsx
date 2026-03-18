import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs } from '../../config/firebase'
import './Prescriptions.css'

function Prescriptions() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/farmer-login')
        return
      }

      loadPrescriptions(user.uid)
    })

    return () => unsubscribe()
  }, [navigate])

  const loadPrescriptions = async (farmerId) => {
    try {
      const q = query(collection(db, 'treatments'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        setPrescriptions([])
        setLoading(false)
        return
      }

      const rxList = snapshot.docs.map(doc => {
        const data = doc.data()
        
        // Calculate safe date if not present
        if (!data.safeDate && data.createdAt && data.withdrawalDays) {
          const createdDate = data.createdAt.toDate()
          const safeDate = new Date(createdDate)
          safeDate.setDate(safeDate.getDate() + parseInt(data.withdrawalDays))
          data.safeDate = { toDate: () => safeDate }
        }
        
        return { id: doc.id, ...data }
      })
      
      rxList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      
      setPrescriptions(rxList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      setLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate()
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const isInWithdrawal = (safeDate) => {
    if (!safeDate) return false
    return safeDate.toDate() > new Date()
  }

  return (
    <div className="prescriptions-container">
      <div className="page-header">
        <h1 className="page-title">My Prescriptions</h1>
        <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
      </div>

      <div className="prescriptions-grid">
        {loading ? (
          <div className="empty-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-prescription"></i>
            <p>No prescriptions received yet</p>
          </div>
        ) : (
          prescriptions.map(rx => (
            <div key={rx.id} className="prescription-card">
              <div className="rx-header">
                <div className="rx-symbol">℞</div>
                <div className="rx-date">
                  <div className="rx-date-label">Prescribed On</div>
                  <div className="rx-date-value">{formatDate(rx.createdAt)}</div>
                </div>
              </div>

              <div className="rx-body">
                <div className="rx-section">
                  <div className="rx-label">
                    <i className="fas fa-paw"></i>
                    Animal ID
                  </div>
                  <div className="rx-value">#{rx.animalId}</div>
                </div>

                <div className="rx-section">
                  <div className="rx-label">
                    <i className="fas fa-pills"></i>
                    Medicine Prescribed
                  </div>
                  <div className="rx-medicine">{rx.medicineName}</div>
                </div>

                <div className="rx-grid">
                  <div className="rx-section">
                    <div className="rx-label">
                      <i className="fas fa-syringe"></i>
                      Dosage
                    </div>
                    <div className="rx-value">{rx.dosage}</div>
                  </div>

                  <div className="rx-section">
                    <div className="rx-label">
                      <i className="fas fa-clock"></i>
                      Withdrawal Period
                    </div>
                    <div className="rx-value">{rx.withdrawalDays} days</div>
                  </div>
                </div>
              </div>

              <div className="rx-footer">
                <div>
                  <div className="rx-label">Safe for Consumption After</div>
                  <div className="rx-value">{formatDate(rx.safeDate)}</div>
                </div>
                <div className={`safe-date-badge ${isInWithdrawal(rx.safeDate) ? 'warning' : 'safe'}`}>
                  <i className={`fas ${isInWithdrawal(rx.safeDate) ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                  {isInWithdrawal(rx.safeDate) ? 'In Withdrawal Period' : 'Safe to Consume'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Prescriptions
