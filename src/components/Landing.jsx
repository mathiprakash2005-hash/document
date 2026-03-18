import React from "react";
import "./Landing.css";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="body">
      <div className="landingcontainer">
        <h1 className="landing-title">VetSafe Tracker</h1>

        <p className="subtitle">
          Smart Livestock Treatment & Product Traceability
        </p>

        <div className="landing-buttons-wrapper">
          <button
            className="login-btn farmer"
            onClick={() => navigate("/farmer-login")}
          >
            👨🌾 Farmer Login
          </button>

          <button
            className="login-btn doctor"
            onClick={() => navigate("/doctor-login")}
          >
            🩺 Doctor Login
          </button>

          <button
            className="login-btn buyer"
            onClick={() => navigate("/buyer-login")}
          >
            🧑💼 Buyer / Client Login
          </button>
        </div>

        <div className="divider"></div>
        <p className="footer-text">From Treatment to Trust</p>
      </div>
    </div>
  );
};

export default Landing;
