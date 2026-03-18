import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, signOut, doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from '../../config/firebase'
import './FarmerDashboard.css'

function FarmerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [animals, setAnimals] = useState([])
  const [stats, setStats] = useState({ total: 0, healthy: 0, treatment: 0, batches: 0, compliance: 0 })
  const [consultStatus, setConsultStatus] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [formData, setFormData] = useState({ species: '', animalId: '', status: 'Healthy', lastTreatment: '' })
  const [consultData, setConsultData] = useState({ animalId: '', urgency: '', symptoms: '' })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      if (userDoc.exists() && userDoc.data().role === 'farmer') {
        setUser(currentUser)
        setUserData(userDoc.data())
        loadAnimals(currentUser.uid)
        loadConsultStatus(currentUser.uid)
      } else {
        await signOut(auth)
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (uid) => {
    const q = query(collection(db, 'animals'), where('farmerId', '==', uid))
    const snapshot = await getDocs(q)
    const animalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    for (let animal of animalsList) {
      const treatmentQuery = query(
        collection(db, 'treatments'),
        where('farmerId', '==', uid),
        where('animalId', '==', animal.animalId)
      )
      const treatmentSnap = await getDocs(treatmentQuery)
      
      if (!treatmentSnap.empty) {
        const treatments = treatmentSnap.docs.map(doc => doc.data())
        const activeTreatment = treatments.find(t => {
          if (t.injectionDate) {
            const injectionDate = new Date(t.injectionDate.toDate())
            const safeDate = new Date(injectionDate)
            safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
            return safeDate > new Date()
          }
          return false
        })
        
        // Update status in database if needed
        if (activeTreatment && animal.status !== 'Withdrawal') {
          await updateDoc(doc(db, 'animals', animal.id), { status: 'Withdrawal' })
          animal.status = 'Withdrawal'
        } else if (!activeTreatment && animal.status === 'Withdrawal') {
          await updateDoc(doc(db, 'animals', animal.id), { status: 'Healthy' })
          animal.status = 'Healthy'
        }
      } else if (animal.status === 'Withdrawal') {
        // No treatments found but status is Withdrawal, reset to Healthy
        await updateDoc(doc(db, 'animals', animal.id), { status: 'Healthy' })
        animal.status = 'Healthy'
      }
    }
    
    const salesQuery = query(collection(db, 'purchases'), where('farmerId', '==', uid))
    const salesSnap = await getDocs(salesQuery)
    const soldCount = salesSnap.size
    
    animalsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    
    setAnimals(animalsList)
    setStats({
      total: animalsList.length,
      healthy: animalsList.filter(a => a.status === 'Healthy').length,
      treatment: animalsList.filter(a => a.status === 'Withdrawal').length,
      batches: soldCount,
      compliance: 98
    })
  }

  const loadConsultStatus = async (uid) => {
    const q = query(
      collection(db, 'consultationRequests'),
      where('farmerId', '==', uid)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      requests.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      const latest = requests[0]
      
      const animalQ = query(collection(db, 'animals'), where('farmerId', '==', uid), where('animalId', '==', latest.animalId))
      const animalSnap = await getDocs(animalQ)
      const animalData = animalSnap.empty ? null : animalSnap.docs[0].data()
      
      setConsultStatus({
        status: latest.status === 'accepted' ? 'Accepted' : 'Pending',
        animalId: latest.animalId,
        animalName: animalData?.speciesDisplay || 'Unknown'
      })
    }
  }

  const generateAnimalId = async (species) => {
    if (!user || !species) return ''
    const q = query(collection(db, 'animals'), where('farmerId', '==', user.uid), where('species', '==', species))
    const snapshot = await getDocs(q)
    return `${species}-${String(snapshot.size + 1).padStart(2, '0')}`
  }

  const handleSpeciesChange = async (species) => {
    setFormData({ ...formData, species, animalId: await generateAnimalId(species) })
  }

  const handleAddAnimal = async (e) => {
    e.preventDefault()
    const speciesMap = { 'COW': '🐄 Cattle (Cow)', 'CHICKEN': '🐔 Poultry (Chicken)', 'GOAT': '🐐 Goat' }
    
    await addDoc(collection(db, 'animals'), {
      farmerId: user.uid,
      animalId: formData.animalId,
      species: formData.species,
      speciesDisplay: speciesMap[formData.species],
      status: formData.status,
      lastTreatment: formData.lastTreatment || null,
      createdAt: serverTimestamp()
    })

    setShowAddModal(false)
    setFormData({ species: '', animalId: '', status: 'Healthy', lastTreatment: '' })
    loadAnimals(user.uid)
  }

  const handleConsultation = async (e) => {
    e.preventDefault()
    await addDoc(collection(db, 'consultationRequests'), {
      farmerId: user.uid,
      animalId: consultData.animalId,
      urgency: consultData.urgency,
      symptoms: consultData.symptoms,
      status: 'pending',
      createdAt: serverTimestamp()
    })

    alert('Consultation request submitted successfully!')
    setShowConsultModal(false)
    setConsultData({ animalId: '', urgency: '', symptoms: '' })
  }

  return (
    <div className="dashboard-container">
      <div className="bg-pattern"></div>

      {/* Sidebar */}
      <aside className={`sidebar ${showSidebar ? 'active' : ''}`}>
        <div className="logo">
          <h1>🌾 VetSafe Tracker</h1>
          <p>Livestock Dashboard</p>
        </div>

        <nav>
          <ul className="nav-menu">
            <li><a href="#" className="nav-link active"><i className="fas fa-chart-line"></i><span>Dashboard</span></a></li>
            <li><a href="#" className="nav-link" onClick={() =>navigate('/farmer-animals')}><i className="fas fa-paw"></i><span>My Animals</span></a></li>
            <li><a href="#" className="nav-link" onClick={() =>navigate('/farmer-treatments')}><i className="fas fa-pills"></i><span>Treatments</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => navigate('/doctor-consultation')}><i className="fas fa-user-md"></i><span>Doctor Consultation</span></a></li>
            <li><a href="#" className="nav-link" onClick={() => navigate('/farmer-prescriptions')}><i className="fas fa-prescription"></i><span>My Prescriptions</span></a></li>
            <li><a href="#" className="nav-link" onClick={() =>navigate('/farmer-certificate')}><i className="fas fa-qrcode"></i><span>Certificate</span></a></li>
            <li><a href="#" className="nav-link" onClick={() =>navigate('/farmer-sold-history')}><i className="fas fa-shopping-cart"></i><span>Product Sold</span></a></li>
            <li><a href="#" className="nav-link" ><i className="fas fa-clipboard-list"></i><span>Compliance</span></a></li>
            <li><a href="#" className="nav-link"><i className="fas fa-bell"></i><span>Notifications</span></a></li>
            <li><a href="#" className="nav-link" onClick={async () => {
              await signOut(auth)
              navigate('/')
            }}><i className="fas fa-cog"></i><span>Logout</span></a></li>
          </ul>
        </nav>
      </aside>

      {/* Mobile Menu Toggle */}
      <button className="menu-toggle" onClick={() => setShowSidebar(!showSidebar)}>
        <i className="fas fa-bars"></i>
      </button>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h2>Welcome Back, {userData?.name || 'Farmer'}</h2>
            <p>Here's what's happening with your livestock today</p>
          </div>
          <div className="header-right">
            <button className="header-btn btn-secondary"><i className="fas fa-download"></i>Export Report</button>
            <button className="header-btn btn-primary" onClick={() => setShowAddModal(true)}><i className="fas fa-plus"></i>Add Animal</button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card" onClick={() => navigate('/farmer-animals')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-paw"></i></div>
              <div className="stat-badge badge-success"><i className="fas fa-arrow-up"></i> 12%</div>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Animals</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--success)'}}><i className="fas fa-check-circle"></i>{stats.healthy} Healthy</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>View All →</span>
            </div>
          </div>

          <div className="stat-card" onClick={() =>navigate('/withdrawal-animals')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-syringe"></i></div>
              <div className="stat-badge badge-warning"><i className="fas fa-exclamation-circle"></i> Active</div>
            </div>
            <div className="stat-value">{stats.treatment}</div>
            <div className="stat-label">Under Treatment</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--warning)'}}><i className="fas fa-clock"></i>0 Pending</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer'}}>Manage →</span>
            </div>
          </div>

          <div className="stat-card" onClick={() =>navigate('/farmer-sold-history')}>
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-box"></i></div>
              <div className="stat-badge badge-success"><i className="fas fa-check"></i> Safe</div>
            </div>
            <div className="stat-value">{stats.batches}</div>
            <div className="stat-label">Product Batch</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--success)'}}><i className="fas fa-certificate"></i>100% Compliant</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>View →</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-chart-pie"></i></div>
              <div className="stat-badge badge-success"><i className="fas fa-star"></i> Excellent</div>
            </div>
            <div className="stat-value">{stats.compliance}%</div>
            <div className="stat-label">Compliance Score</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: 'var(--success)'}}><i className="fas fa-arrow-up"></i>+5% This Month</span>
              <span style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Details →</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon"><i className="fas fa-user-md"></i></div>
              <div className={`stat-badge ${consultStatus?.status === 'Accepted' ? 'badge-success' : 'badge-warning'}`}>
                <i className={`fas ${consultStatus?.status === 'Accepted' ? 'fa-check' : 'fa-clock'}`}></i>
                {consultStatus?.status === 'Accepted' ? 'Accepted' : 'Pending'}
              </div>
            </div>
            <div className="stat-value" style={{fontSize: '1.2rem'}}>
              {consultStatus ? `#${consultStatus.animalId}` : 'No Request'}
            </div>
            <div className="stat-label">Consultation Status</div>
            <div className="stat-footer">
              <span className="stat-change" style={{color: consultStatus?.status === 'Accepted' ? 'var(--success)' : 'var(--warning)'}}>
                <i className={`fas ${consultStatus?.status === 'Accepted' ? 'fa-check-circle' : 'fa-hourglass-half'}`}></i>
                {consultStatus ? (consultStatus.status === 'Accepted' ? `Doctor accepted - ${consultStatus.animalName}` : `Waiting for doctor - ${consultStatus.animalName}`) : 'Submit a request'}
              </span>
            </div>
          </div>
        </section>
        

        {/* Quick Actions */}
        <section className="quick-actions">
          <h3 className="section-title"><i className="fas fa-bolt"></i>Quick Actions</h3>
          <div className="actions-grid">
            <div className="action-card" onClick={() => setShowAddModal(true)}>
              <div className="action-icon"><i className="fas fa-plus-circle"></i></div>
              <div className="action-title">Add New Animal</div>
              <div className="action-desc">Register livestock in system</div>
            </div>
            <div className="action-card" onClick={() => navigate('/doctor-consultation')}>
              <div className="action-icon"><i className="fas fa-stethoscope"></i></div>
              <div className="action-title">Request Consultation</div>
              <div className="action-desc">Connect with veterinarian</div>
            </div>
            <div className="action-card"onClick={() =>navigate('/farmer-certificate')}>
              <div className="action-icon"><i className="fas fa-box-open"></i></div>
              <div className="action-title">Create Certificate</div>
              <div className="action-desc">Generate product Certificate</div>
            </div>
            {/* <div className="action-card">
              <div className="action-icon"><i className="fas fa-qrcode"></i></div>
              <div className="action-title">Scan QR Code</div>
              <div className="action-desc">Verify batch information</div>
            </div> */}
          </div>
        </section>

        {/* Recent Animals */}
        <section className="data-section">
          <h3 className="section-title"><i className="fas fa-paw"></i>Recent Animals</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Animal ID</th>
                  <th>Species</th>
                  <th>Status</th>
                  <th>Last Treatment</th>
                  <th>Withdrawal Ends</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                      <i className="fas fa-paw" style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.3}}></i>
                      <p>No animals added yet. Click "Add Animal" to get started.</p>
                    </td>
                  </tr>
                ) : (
                  animals.map(animal => (
                    <tr key={animal.id}>
                      <td className="animal-id">#{animal.animalId}</td>
                      <td>{animal.speciesDisplay}</td>
                      <td><span className={`status-badge status-${animal.status.toLowerCase().replace(' ', '-')}`}>{animal.status}</span></td>
                      <td>{animal.lastTreatment || '—'}</td>
                      <td>—</td>
                      <td><button className="action-btn">View Details</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Notifications */}
        <section className="notifications-panel">
          <h3 className="section-title"><i className="fas fa-bell"></i>Recent Notifications</h3>
          <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
            <i className="fas fa-bell-slash" style={{fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3}}></i>
            <p>No notifications yet</p>
          </div>
        </section>
      </main>

      {/* Add Animal Modal */}
      {showAddModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Animal</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddAnimal}>
              <div className="form-group">
                <label className="form-label">Species</label>
                <select className="form-select" value={formData.species} onChange={(e) => handleSpeciesChange(e.target.value)} required>
                  <option value="">Select Species</option>
                  <option value="COW">🐄 Cattle (Cow)</option>
                  <option value="CHICKEN">🐔 Poultry (Chicken)</option>
                  <option value="GOAT">🐐 Goat</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Animal ID</label>
                <input type="text" className="form-input" value={formData.animalId} readOnly style={{background: 'var(--bg-primary)', cursor: 'not-allowed'}} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} required>
                  <option value="Healthy">Healthy</option>
                  <option value="Under Treatment">Under Treatment</option>
                  <option value="Withdrawal Period">Withdrawal Period</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Last Treatment Date (Optional)</label>
                <input type="date" className="form-input" value={formData.lastTreatment} onChange={(e) => setFormData({...formData, lastTreatment: e.target.value})} />
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn btn-submit">Add Animal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consultation Modal */}
      {showConsultModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Request Consultation</h3>
              <button className="modal-close" onClick={() => setShowConsultModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleConsultation}>
              <div className="form-group">
                <label className="form-label">Select Animal</label>
                <select className="form-select" value={consultData.animalId} onChange={(e) => setConsultData({...consultData, animalId: e.target.value})} required>
                  <option value="">Select Animal</option>
                  {animals.map(a => <option key={a.id} value={a.animalId}>{a.speciesDisplay} - #{a.animalId}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Urgency Level</label>
                <select className="form-select" value={consultData.urgency} onChange={(e) => setConsultData({...consultData, urgency: e.target.value})} required>
                  <option value="">Select Urgency</option>
                  <option value="High">🔴 High - Immediate attention needed</option>
                  <option value="Medium">🟠 Medium - Within 24 hours</option>
                  <option value="Low">🟢 Low - Routine checkup</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Symptoms Description</label>
                <textarea className="form-input" rows="5" value={consultData.symptoms} onChange={(e) => setConsultData({...consultData, symptoms: e.target.value})} placeholder="Describe the symptoms, behavior changes, or concerns..." required style={{resize: 'vertical', minHeight: '120px'}}></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn btn-cancel" onClick={() => setShowConsultModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn btn-submit">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmerDashboard
