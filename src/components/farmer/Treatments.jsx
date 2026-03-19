import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, updateDoc } from '../../config/firebase'
import { Timestamp } from 'firebase/firestore'
import { notifyTreatmentCompleted } from '../../services/notificationService'
import './Treatments.css'

function Treatments() {
  const navigate = useNavigate()
  const [treatments, setTreatments] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        loadTreatments(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadTreatments = async (farmerId) => {
    try {
      const q = query(collection(db, 'treatments'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setTreatments([])
        setLoading(false)
        return
      }

      const treatmentsList = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()
        let doctorName = 'N/A'
        
        if (data.doctorId) {
          const doctorDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', data.doctorId)))
          if (!doctorDoc.empty) {
            doctorName = doctorDoc.docs[0].data().name || 'N/A'
          }
        }
        
        return { id: docSnap.id, ...data, doctorName }
      }))
      
      treatmentsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      
      setTreatments(treatmentsList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading treatments:', error)
      setLoading(false)
    }
  }

  const markInjectionGiven = async (treatmentId) => {
    try {
      const treatment = treatments.find(t => t.id === treatmentId)
      if (!treatment) return

      const today = new Date()
      await updateDoc(doc(db, 'treatments', treatmentId), {
        injectionDate: Timestamp.fromDate(today)
      })

      const safeDate = new Date(today)
      safeDate.setDate(safeDate.getDate() + parseInt(treatment.withdrawalDays || 0))

      const animalsQ = query(
        collection(db, 'animals'),
        where('farmerId', '==', treatment.farmerId),
        where('animalId', '==', treatment.animalId)
      )
      const animalsSnap = await getDocs(animalsQ)
      animalsSnap.forEach(animalDoc => {
        updateDoc(doc(db, 'animals', animalDoc.id), { status: 'Withdrawal' })
      })
      
      // Notify farmer that treatment has been marked as given
      await notifyTreatmentCompleted(treatment.farmerId, treatment.animalId)

      if (user) loadTreatments(user.uid)
    } catch (error) {
      console.error('Error marking injection:', error)
      alert('Failed to mark injection as given')
    }
  }

  return (
    <div className="treatments-container">
      <div className="page-header">
        <h1 className="page-title">My Treatment Records</h1>
        <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
      </div>

      <div className="treatments-table">
        <table>
          <thead>
            <tr>
              <th><i className="fas fa-paw"></i> Animal ID</th>
              <th><i className="fas fa-user-md"></i> Doctor Name</th>
              <th><i className="fas fa-pills"></i> Medicine Name</th>
              <th><i className="fas fa-syringe"></i> Dosage</th>
              <th><i className="fas fa-syringe"></i> Injection Status</th>
              <th><i className="fas fa-clock"></i> Withdrawal (days)</th>
              <th><i className="fas fa-calendar-check"></i> Safe Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading treatments...</p>
                  </div>
                </td>
              </tr>
            ) : treatments.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    <i className="fas fa-pills"></i>
                    <p>No treatment records found</p>
                  </div>
                </td>
              </tr>
            ) : (
              treatments.map(treatment => {
                const injectionDate = treatment.injectionDate ? treatment.injectionDate.toDate() : null
                const injectionDateStr = injectionDate ? injectionDate.toISOString().split('T')[0] : ''
                
                let safeDateDisplay = <span className="safe-date warning">Not given yet</span>
                if (injectionDate) {
                  const safeDate = new Date(injectionDate)
                  safeDate.setDate(safeDate.getDate() + parseInt(treatment.withdrawalDays || 0))
                  const isWarning = safeDate > new Date()
                  safeDateDisplay = (
                    <span className={`safe-date ${isWarning ? 'warning' : ''}`}>
                      {safeDate.toLocaleDateString()}
                    </span>
                  )
                }

                return (
                  <tr key={treatment.id}>
                    <td className="animal-id">#{treatment.animalId}</td>
                    <td>{treatment.doctorName}</td>
                    <td>{treatment.medicineName}</td>
                    <td>{treatment.dosage}</td>
                    <td>
                      {treatment.injectionDate ? (
                        <span className="injection-given">
                          <i className="fas fa-check-circle"></i> Given on {new Date(treatment.injectionDate.toDate()).toLocaleDateString()}
                        </span>
                      ) : (
                        <button className="injection-btn" onClick={() => markInjectionGiven(treatment.id)}>
                          <i className="fas fa-syringe"></i> Mark as Given
                        </button>
                      )}
                    </td>
                    <td>{treatment.withdrawalDays} days</td>
                    <td>{safeDateDisplay}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Treatments
