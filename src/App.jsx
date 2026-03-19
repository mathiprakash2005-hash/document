import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Landing from './components/Landing'
import FarmerRegister from './components/farmer/FarmerRegister'
import FarmerLogin from './components/farmer/FarmerLogin'
import FarmerDashboard from './components/farmer/FarmerDashboard'
import Prescriptions from './components/farmer/Prescriptions'
import CertificateGen from './components/farmer/CertificateGen'
import SoldHistory from './components/farmer/SoldHistory'
import Treatments from './components/farmer/Treatments'
import MyAnimals from './components/farmer/MyAnimals'
import WithdrawalAnimals from './components/farmer/WithdrawalAnimals'
import DoctorConsultation from './components/farmer/DoctorConsultation'
import DoctorLogin from './components/doctor/DoctorLogin'
import DoctorDashboard from './components/doctor/DoctorDashboard'
import DoctorRegister from './components/doctor/DoctorRegister'
import DoctorPrescriptions from './components/doctor/DoctorPrescriptions'
import DoctorAnalytics from './components/doctor/DoctorAnalytics'
import ApprovedPrescriptions from './components/doctor/ApprovedPrescriptions'
import RejectedPrescriptions from './components/doctor/RejectedPrescriptions'
import ConsultationRequests from './components/doctor/ConsultationRequests'
import BuyerLogin from './components/buyer/BuyerLogin'
import BuyerRegister from './components/buyer/BuyerRegister'
import BuyerDashboard from './components/buyer/BuyerDashboard'
import BuyerVerify from './components/buyer/BuyerVerify'
import VetChatbot from './components/chatbot/VetChatbot'

function AppContent() {
  const location = useLocation()
  const hideChatbotPaths = [
    '/', 
    '/farmer-login', 
    '/farmer-register', 
    '/doctor-login', 
    '/doctor-register', 
    '/doctor-dashboard',
    '/doctor-prescriptions',
    '/doctor-analytics',
    '/approved-prescriptions',
    '/rejected-prescriptions',
    '/consultation-requests',
    '/buyer-login', 
    '/buyer-register',
    '/buyer-dashboard',
    '/buyer-verify'
  ]
  const showChatbot = !hideChatbotPaths.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/farmer-register" element={<FarmerRegister />} />
        <Route path="/farmer-login" element={<FarmerLogin />} />
        <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
        <Route path="/farmer-prescriptions" element={<Prescriptions />} />
        <Route path="/farmer-certificate" element={<CertificateGen />} />
        <Route path="/farmer-sold-history" element={<SoldHistory />} />
        <Route path="/farmer-treatments" element={<Treatments />} />
        <Route path="/farmer-animals" element={<MyAnimals />} />
        <Route path="/withdrawal-animals" element={<WithdrawalAnimals />} />
        <Route path="/doctor-consultation" element={<DoctorConsultation />} />
        <Route path="/doctor-login" element={<DoctorLogin />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor-register" element={<DoctorRegister />} />
        <Route path="/doctor-prescriptions" element={<DoctorPrescriptions />} />
        <Route path="/doctor-analytics" element={<DoctorAnalytics />} />
        <Route path="/approved-prescriptions" element={<ApprovedPrescriptions />} />
        <Route path="/rejected-prescriptions" element={<RejectedPrescriptions />} />
        <Route path="/consultation-requests" element={<ConsultationRequests />} />
        <Route path="/buyer-login" element={<BuyerLogin />} />
        <Route path="/buyer-register" element={<BuyerRegister />} />
        <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
        <Route path="/buyer-verify" element={<BuyerVerify />} />
      </Routes>
      {showChatbot && <VetChatbot />}
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
