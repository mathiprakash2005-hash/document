import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db, collection, getDocs, doc, getDoc } from '../../config/firebase'
import './DoctorAnalytics.css'

export default function DoctorAnalytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalConsultations: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    acceptanceRate: 0,
    avgResponseTime: 0,
    urgentCases: 0
  })

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/doctor-login')
        return
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists() && userDoc.data().role === 'doctor') {
        await loadAnalytics(user.uid)
      } else {
        navigate('/doctor-login')
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const loadAnalytics = async (doctorId) => {
    try {
      // Get all consultation requests
      const requestsSnap = await getDocs(collection(db, 'consultationRequests'))
      const allRequests = requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Get all treatments (accepted prescriptions)
      const treatmentsSnap = await getDocs(collection(db, 'treatments'))
      const allTreatments = treatmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Calculate metrics
      const pending = allRequests.filter(r => r.status === 'pending').length
      const accepted = allRequests.filter(r => r.status === 'accepted').length
      const rejected = allRequests.filter(r => r.status === 'rejected').length
      const totalConsultations = pending + accepted + rejected

      // Calculate acceptance rate
      const acceptanceRate = totalConsultations > 0 
        ? ((accepted / (accepted + rejected)) * 100).toFixed(1)
        : 0

      // Calculate average response time (in hours)
      let totalResponseTime = 0
      let respondedCount = 0

      allRequests.forEach(request => {
        if (request.status === 'accepted' && request.acceptedAt && request.createdAt) {
          const responseTime = (request.acceptedAt.toMillis() - request.createdAt.toMillis()) / (1000 * 60 * 60)
          totalResponseTime += responseTime
          respondedCount++
        } else if (request.status === 'rejected' && request.rejectedAt && request.createdAt) {
          const responseTime = (request.rejectedAt.toMillis() - request.createdAt.toMillis()) / (1000 * 60 * 60)
          totalResponseTime += responseTime
          respondedCount++
        }
      })

      const avgResponseTime = respondedCount > 0 
        ? (totalResponseTime / respondedCount).toFixed(1)
        : 0

      // Count urgent cases
      const urgentCases = allRequests.filter(r => r.urgency === 'High').length

      setMetrics({
        totalConsultations,
        pending,
        accepted,
        rejected,
        acceptanceRate,
        avgResponseTime,
        urgentCases
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading analytics:', error)
      setLoading(false)
    }
  }

  return (
    <div className="analytics-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">
            <i className="fas fa-chart-bar"></i> Doctor Analytics
          </h1>
          <button className="back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Performance Metrics Section */}
            <section className="analytics-section">
              <h2 className="section-title">
                <i className="fas fa-tachometer-alt"></i> Performance Metrics
              </h2>
              
              <div className="metrics-grid">
                {/* Total Consultations */}
                <div className="metric-card">
                  <div className="metric-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.totalConsultations}</div>
                    <div className="metric-label">Total Consultations</div>
                    <div className="metric-breakdown">
                      <span className="breakdown-item">
                        <i className="fas fa-clock" style={{color: '#f59e0b'}}></i> {metrics.pending} Pending
                      </span>
                      <span className="breakdown-item">
                        <i className="fas fa-check" style={{color: '#10b981'}}></i> {metrics.accepted} Accepted
                      </span>
                      <span className="breakdown-item">
                        <i className="fas fa-times" style={{color: '#ef4444'}}></i> {metrics.rejected} Rejected
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acceptance Rate */}
                <div className="metric-card">
                  <div className="metric-icon" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                    <i className="fas fa-percentage"></i>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.acceptanceRate}%</div>
                    <div className="metric-label">Acceptance Rate</div>
                    <div className="metric-description">
                      {metrics.acceptanceRate >= 80 ? (
                        <span style={{color: '#10b981'}}>
                          <i className="fas fa-thumbs-up"></i> Excellent performance
                        </span>
                      ) : metrics.acceptanceRate >= 60 ? (
                        <span style={{color: '#f59e0b'}}>
                          <i className="fas fa-info-circle"></i> Good performance
                        </span>
                      ) : (
                        <span style={{color: '#ef4444'}}>
                          <i className="fas fa-exclamation-triangle"></i> Needs improvement
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Average Response Time */}
                <div className="metric-card">
                  <div className="metric-icon" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.avgResponseTime}h</div>
                    <div className="metric-label">Avg Response Time</div>
                    <div className="metric-description">
                      {metrics.avgResponseTime <= 2 ? (
                        <span style={{color: '#10b981'}}>
                          <i className="fas fa-bolt"></i> Very fast response
                        </span>
                      ) : metrics.avgResponseTime <= 6 ? (
                        <span style={{color: '#f59e0b'}}>
                          <i className="fas fa-clock"></i> Moderate response
                        </span>
                      ) : (
                        <span style={{color: '#ef4444'}}>
                          <i className="fas fa-hourglass-half"></i> Slow response
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Urgent Cases */}
                <div className="metric-card">
                  <div className="metric-icon" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.urgentCases}</div>
                    <div className="metric-label">Urgent Cases Handled</div>
                    <div className="metric-description">
                      <span style={{color: '#ef4444'}}>
                        <i className="fas fa-fire"></i> High priority consultations
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Status Distribution */}
            <section className="analytics-section">
              <h2 className="section-title">
                <i className="fas fa-chart-pie"></i> Consultation Status Distribution
              </h2>
              
              <div className="status-bars">
                <div className="status-bar-item">
                  <div className="status-bar-header">
                    <span className="status-bar-label">
                      <i className="fas fa-clock" style={{color: '#f59e0b'}}></i> Pending
                    </span>
                    <span className="status-bar-value">{metrics.pending}</span>
                  </div>
                  <div className="status-bar-track">
                    <div 
                      className="status-bar-fill" 
                      style={{
                        width: `${metrics.totalConsultations > 0 ? (metrics.pending / metrics.totalConsultations * 100) : 0}%`,
                        background: '#f59e0b'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="status-bar-item">
                  <div className="status-bar-header">
                    <span className="status-bar-label">
                      <i className="fas fa-check-circle" style={{color: '#10b981'}}></i> Accepted
                    </span>
                    <span className="status-bar-value">{metrics.accepted}</span>
                  </div>
                  <div className="status-bar-track">
                    <div 
                      className="status-bar-fill" 
                      style={{
                        width: `${metrics.totalConsultations > 0 ? (metrics.accepted / metrics.totalConsultations * 100) : 0}%`,
                        background: '#10b981'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="status-bar-item">
                  <div className="status-bar-header">
                    <span className="status-bar-label">
                      <i className="fas fa-times-circle" style={{color: '#ef4444'}}></i> Rejected
                    </span>
                    <span className="status-bar-value">{metrics.rejected}</span>
                  </div>
                  <div className="status-bar-track">
                    <div 
                      className="status-bar-fill" 
                      style={{
                        width: `${metrics.totalConsultations > 0 ? (metrics.rejected / metrics.totalConsultations * 100) : 0}%`,
                        background: '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary Cards */}
            <section className="analytics-section">
              <h2 className="section-title">
                <i className="fas fa-info-circle"></i> Quick Insights
              </h2>
              
              <div className="insights-grid">
                <div className="insight-card">
                  <i className="fas fa-trophy insight-icon" style={{color: '#f59e0b'}}></i>
                  <h3>Performance Rating</h3>
                  <p>
                    {metrics.acceptanceRate >= 80 && metrics.avgResponseTime <= 6 
                      ? '⭐⭐⭐⭐⭐ Outstanding'
                      : metrics.acceptanceRate >= 60 && metrics.avgResponseTime <= 12
                      ? '⭐⭐⭐⭐ Very Good'
                      : metrics.acceptanceRate >= 40
                      ? '⭐⭐⭐ Good'
                      : '⭐⭐ Needs Improvement'
                    }
                  </p>
                </div>

                <div className="insight-card">
                  <i className="fas fa-lightbulb insight-icon" style={{color: '#3b82f6'}}></i>
                  <h3>Recommendation</h3>
                  <p>
                    {metrics.pending > 5 
                      ? 'Focus on clearing pending requests'
                      : metrics.avgResponseTime > 6
                      ? 'Try to reduce response time'
                      : 'Keep up the excellent work!'
                    }
                  </p>
                </div>

                <div className="insight-card">
                  <i className="fas fa-chart-line insight-icon" style={{color: '#10b981'}}></i>
                  <h3>Activity Level</h3>
                  <p>
                    {metrics.totalConsultations >= 50 
                      ? 'Very Active'
                      : metrics.totalConsultations >= 20
                      ? 'Moderately Active'
                      : 'Getting Started'
                    }
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
