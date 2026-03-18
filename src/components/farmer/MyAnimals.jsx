import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, doc, deleteDoc } from '../../config/firebase'
import './MyAnimals.css'

function MyAnimals() {
  const navigate = useNavigate()
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [selectedAnimal, setSelectedAnimal] = useState(null)

  useEffect(() => {
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
    try {
      const q = query(collection(db, 'animals'), where('farmerId', '==', farmerId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setAnimals([])
        setLoading(false)
        return
      }

      const animalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Check treatment status for each animal
      for (let animal of animalsList) {
        const treatmentQ = query(
          collection(db, 'treatments'),
          where('farmerId', '==', farmerId),
          where('animalId', '==', animal.animalId)
        )
        const treatmentSnap = await getDocs(treatmentQ)

        if (!treatmentSnap.empty) {
          const treatments = treatmentSnap.docs.map(doc => doc.data())
          const activeTreatment = treatments.find(t => {
            if (t.injectionDate) {
              const injectionDate = t.injectionDate.toDate()
              const safeDate = new Date(injectionDate)
              safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
              return safeDate > new Date()
            }
            return false
          })

          if (activeTreatment) {
            animal.status = 'Withdrawal'
          }
        }
      }

      animalsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      setAnimals(animalsList)
      setLoading(false)
    } catch (error) {
      console.error('Error loading animals:', error)
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this animal?')) {
      try {
        await deleteDoc(doc(db, 'animals', id))
        if (user) loadAnimals(user.uid)
      } catch (error) {
        alert('Error deleting animal: ' + error.message)
      }
    }
  }

  return (
    <div className="animals-container">
      <div className="page-header">
        <h1 className="page-title">My Animals</h1>
        <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
      </div>

     

      {loading ? (
        <div className="empty-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading animals...</p>
        </div>
      ) : animals.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-paw"></i>
          <p>No animals found. Add your first animal from the dashboard.</p>
        </div>
      ) : (
        <div className="animals-grid">
          {animals.map(animal => (
            <div key={animal.id} className="animal-card">
              <div className="animal-header">
                <div className="animal-id">#{animal.animalId}</div>
                <span className={`status-badge status-${animal.status.toLowerCase().replace(' ', '-')}`}>
                  {animal.status}
                </span>
              </div>
              <div className="animal-species">{animal.speciesDisplay}</div>
              <div className="animal-info">
                <div className="info-row">
                  <span className="info-label">Last Treatment</span>
                  <span className="info-value">{animal.lastTreatment || 'None'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Added On</span>
                  <span className="info-value">
                    {animal.createdAt ? animal.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="animal-actions">
                <button className="action-btn" onClick={() => setSelectedAnimal(animal)}>
                  <i className="fas fa-eye"></i> View
                </button>
                {/* <button className="action-btn" onClick={() => alert('Edit animal: ' + animal.id)}>
                  <i className="fas fa-edit"></i> Edit
                </button> */}
                <button className="action-btn" onClick={() => handleDelete(animal.id)}>
                  <i className="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAnimal && (
        <div className="modal-overlay" onClick={() => setSelectedAnimal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Animal Details</h2>
              <button className="close-btn" onClick={() => setSelectedAnimal(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Animal ID:</span>
                <span className="detail-value">#{selectedAnimal.animalId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Species:</span>
                <span className="detail-value">{selectedAnimal.speciesDisplay}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`status-badge status-${selectedAnimal.status.toLowerCase().replace(' ', '-')}`}>
                  {selectedAnimal.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Treatment:</span>
                <span className="detail-value">{selectedAnimal.lastTreatment || 'None'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Added On:</span>
                <span className="detail-value">
                  {selectedAnimal.createdAt ? selectedAnimal.createdAt.toDate().toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyAnimals
