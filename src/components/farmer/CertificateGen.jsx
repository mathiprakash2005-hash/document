import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, query, where, getDocs, addDoc, serverTimestamp } from '../../config/firebase'
import { notifyWithdrawalActive } from '../../services/notificationService'
import html2canvas from 'html2canvas'
import './CertificateGen.css'

function CertificateGen() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [farmerName, setFarmerName] = useState('')
  const [animals, setAnimals] = useState([])
  const [storedCerts, setStoredCerts] = useState([])
  const [formData, setFormData] = useState({ animalId: '', productType: '', quantity: '' })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [flippedCard, setFlippedCard] = useState(null)

  const productRules = {
    'COW': ['Milk'],
    'CHICKEN': ['Eggs', 'Meat'],
    'GOAT': ['Milk', 'Meat']
  }

  const yieldLimits = {
    'COW-Milk': 40,
    'CHICKEN-Eggs': 300,
    'CHICKEN-Meat': 3,
    'GOAT-Milk': 5,
    'GOAT-Meat': 30
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/farmer-login')
        return
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)))
      if (!userDoc.empty && userDoc.docs[0].data().role === 'farmer') {
        setUser(currentUser)
        setFarmerName(userDoc.docs[0].data().name)
        loadAnimals(currentUser.uid)
        loadStoredCerts(currentUser.uid)
      } else {
        navigate('/farmer-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnimals = async (uid) => {
    const q = query(collection(db, 'animals'), where('farmerId', '==', uid))
    const snapshot = await getDocs(q)
    setAnimals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  }

  const loadStoredCerts = async (uid) => {
    const q = query(collection(db, 'sales'), where('farmerId', '==', uid))
    const snapshot = await getDocs(q)
    
    const certs = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const saleData = docSnap.data()
      
      if (!saleData.certId) return null
      
      const purchaseQuery = query(collection(db, 'purchases'), where('certId', '==', saleData.certId))
      const purchaseSnap = await getDocs(purchaseQuery)
      const isSold = !purchaseSnap.empty
      
      return { id: docSnap.id, ...saleData, isSold }
    }))
    
    const validCerts = certs.filter(cert => cert !== null)
    validCerts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    setStoredCerts(validCerts)
  }

  const handleAnimalChange = (animalId) => {
    const animal = animals.find(a => a.animalId === animalId)
    setFormData({ ...formData, animalId, productType: '' })
    setProducts(animal ? productRules[animal.species] || [] : [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const animal = animals.find(a => a.animalId === formData.animalId)
      if (!animal) {
        setError('Animal not registered under your farm')
        setLoading(false)
        return
      }

      const yieldKey = `${animal.species}-${formData.productType}`
      if (yieldLimits[yieldKey] && parseFloat(formData.quantity) > yieldLimits[yieldKey]) {
        const unit = formData.productType === 'Milk' ? 'L' : formData.productType === 'Eggs' ? 'pcs' : 'kg'
        setError(`Quantity exceeds realistic production. Max: ${yieldLimits[yieldKey]} ${unit}`)
        setLoading(false)
        return
      }

      const treatmentQ = query(collection(db, 'treatments'), where('farmerId', '==', user.uid), where('animalId', '==', formData.animalId))
      const treatmentSnap = await getDocs(treatmentQ)

      let lastMedicine = 'None'
      let prescriptionId = 'N/A'

      if (!treatmentSnap.empty) {
        for (let doc of treatmentSnap.docs) {
          const t = doc.data()
          if (t.injectionDate) {
            const injDate = t.injectionDate.toDate()
            const safeDate = new Date(injDate)
            safeDate.setDate(safeDate.getDate() + parseInt(t.withdrawalDays || 0))
            if (new Date() < safeDate) {
              // Send notification about active withdrawal period
              await notifyWithdrawalActive(user.uid, formData.animalId)
              setError(`Withdrawal period active until ${safeDate.toLocaleDateString()}`)
              setLoading(false)
              return
            }
            lastMedicine = t.medicineName
            prescriptionId = doc.id
          }
        }
      }

      const salesQ = query(collection(db, 'sales'), where('farmerId', '==', user.uid), where('animalId', '==', formData.animalId))
      const salesSnap = await getDocs(salesQ)
      
      // Check if there's an unsold certificate for this animal
      for (let saleDoc of salesSnap.docs) {
        const saleData = saleDoc.data()
        const certId = saleData.certId || `VS-${new Date().getFullYear()}-${saleDoc.id.substring(0, 6).toUpperCase()}`
        
        const purchaseQuery = query(collection(db, 'purchases'), where('certId', '==', certId))
        const purchaseSnap = await getDocs(purchaseQuery)
        
        if (purchaseSnap.empty) {
          setError('Previous certificate for this animal is not yet sold. Cannot generate new certificate.')
          setLoading(false)
          return
        }
      }

      const certId = `VS-${new Date().getFullYear()}-${Date.now().toString().substring(7, 13).toUpperCase()}`
      const batchId = `${formData.productType}${Date.now().toString().substring(11, 13).toUpperCase()}`

      const saleRef = await addDoc(collection(db, 'sales'), {
        certId,
        batchId,
        farmerId: user.uid,
        farmerName,
        animalId: formData.animalId,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        lastMedicine,
        prescriptionId,
        status: 'SAFE',
        createdAt: serverTimestamp(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })

      setCertificate({
        certId,
        batchId,
        farmerName,
        animalId: formData.animalId,
        productType: formData.productType,
        quantity: formData.quantity,
        lastMedicine,
        timestamp: new Date().toLocaleDateString()
      })

      loadStoredCerts(user.uid)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const downloadCertificate = () => {
    const cert = document.querySelector('.certificate')
    if (!cert) return

    html2canvas(cert, { backgroundColor: '#1e293b', scale: 2 }).then(canvas => {
      const link = document.createElement('a')
      link.download = `Certificate-${certificate.animalId}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }

  return (
    <div className="cert-container">
      <div className="page-header">
        <h1 className="page-title">Generate Certificate</h1>
        <button className="back-btn" onClick={() => navigate('/farmer-dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h2 className="card-title">
            <i className="fas fa-certificate"></i>
            Product Details
          </h2>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Select Animal</label>
              <select className="form-select" value={formData.animalId} onChange={(e) => handleAnimalChange(e.target.value)} required>
                <option value="">Select Animal</option>
                {animals.map(a => (
                  <option key={a.id} value={a.animalId}>{a.speciesDisplay} - #{a.animalId}</option>
                ))}
              </select>
            </div> 

            <div className="form-group">
              <label className="form-label">Product Type</label>
              <select className="form-select" value={formData.productType} onChange={(e) => setFormData({...formData, productType: e.target.value})} required>
                <option value="">Select Product</option>
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" className="form-input" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} placeholder="Enter quantity" required min="0.1" step="0.1" />
            </div>

            <button type="submit" className="generate-btn" disabled={loading}>
              <i className="fas fa-certificate"></i> {loading ? 'Generating...' : 'Generate Certificate'}
            </button>
          </form>
        </div>

        <div className="qr-card">
          <h2 className="card-title">
            <i className="fas fa-award"></i>
            Certificate Preview
          </h2>

          {loading ? (
            <div style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="spinner"></div>
              <p style={{color: 'var(--text-muted)'}}>Validating and generating certificate...</p>
            </div>
          ) : certificate ? (
            <div>
              <div className="certificate">
                <div className="cert-header">
                  <div className="cert-main-title">SAFE FOOD CERTIFICATE</div>
                  <div className="cert-id">Certificate ID: {certificate.certId}</div>
                </div>
                <div className="cert-row"><span className="cert-label">Farmer:</span><span className="cert-value">{certificate.farmerName}</span></div>
                <div className="cert-row"><span className="cert-label">Animal:</span><span className="cert-value">{certificate.animalId}</span></div>
                <div className="cert-row"><span className="cert-label">Product:</span><span className="cert-value">{certificate.productType}</span></div>
                <div className="cert-row"><span className="cert-label">Quantity:</span><span className="cert-value">{certificate.quantity} {certificate.productType === 'Milk' ? 'L' : certificate.productType === 'Eggs' ? 'pcs' : 'kg'}</span></div>
                <div className="cert-row"><span className="cert-label">Last Medicine:</span><span className="cert-value">{certificate.lastMedicine}</span></div>
                <div className="cert-row"><span className="cert-label">Withdrawal Completed:</span><span className="cert-value">YES</span></div>
                <div className="cert-row"><span className="cert-label">Verified By:</span><span className="cert-value">VetSafe Tracker System</span></div>
                <div className="cert-row"><span className="cert-label">Timestamp:</span><span className="cert-value">{certificate.timestamp}</span></div>
                <div className="cert-status">✓ SAFE FOR HUMAN CONSUMPTION</div>
              </div>
              <button className="download-btn" onClick={downloadCertificate}>
                <i className="fas fa-download"></i> Download Certificate
              </button>
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)'}}>
              <i className="fas fa-certificate" style={{fontSize: '4rem', marginBottom: '1rem', opacity: 0.3}}></i>
              <p>Fill the form to generate certificate</p>
            </div>
          )}
        </div>
      </div>

      <div className="form-card" style={{marginTop: '2rem'}}>
        <h2 className="card-title">
          <i className="fas fa-history"></i>
          Stored Certificates
        </h2>
        <div className="stored-certs">
          {storedCerts.length === 0 ? (
            <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
              <i className="fas fa-inbox" style={{fontSize: '3rem', opacity: 0.3, marginBottom: '1rem'}}></i>
              <p>No certificates generated yet</p>
            </div>
          ) : (
            storedCerts.map(sale => {
              const batchId = sale.batchId || 'N/A'
              const certId = sale.certId || 'N/A'
              return (
                <div key={sale.id} className="flip-card" onClick={() => setFlippedCard(flippedCard === sale.id ? null : sale.id)}>
                  <div className={`flip-card-inner ${flippedCard === sale.id ? 'flipped' : ''}`}>
                    <div className="flip-card-front">
                      <i className="fas fa-certificate" style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.9}}></i>
                      <div className="batch-id">Batch: {batchId}</div>
                      <div className="batch-subtitle">Click to view details</div>
                      {sale.isSold && <div className="sold-badge">✓ SOLD</div>}
                    </div>
                    <div className="flip-card-back">
                      <div className="cert-title">SAFE FOOD CERTIFICATE</div>
                      <div className="cert-row"><span className="cert-label">Farmer:</span><span className="cert-value">{sale.farmerName}</span></div>
                      <div className="cert-row"><span className="cert-label">Animal:</span><span className="cert-value">{sale.animalId}</span></div>
                      <div className="cert-row"><span className="cert-label">Product:</span><span className="cert-value">{sale.productType}</span></div>
                      <div className="cert-row" style={{background: 'rgba(167, 139, 250, 0.1)', fontWeight: 'bold'}}>
                        <span className="cert-label">Certificate ID:</span>
                        <span className="cert-value" style={{color: 'var(--accent)', fontSize: '0.95rem'}}>{certId}</span>
                      </div>
                      <div className="cert-row"><span className="cert-label">Quantity:</span><span className="cert-value">{sale.quantity} {sale.productType === 'Milk' ? 'L' : sale.productType === 'Eggs' ? 'pcs' : 'kg'}</span></div>
                      <div className="cert-row"><span className="cert-label">Last Medicine:</span><span className="cert-value">{sale.lastMedicine}</span></div>
                      <div className="cert-row"><span className="cert-label">Withdrawal:</span><span className="cert-value">YES</span></div>
                      <div className="cert-row"><span className="cert-label">Date:</span><span className="cert-value">{sale.createdAt?.toDate().toLocaleDateString() || 'N/A'}</span></div>
                      <div className="cert-status">✓ SAFE FOR CONSUMPTION</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default CertificateGen
