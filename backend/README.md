# Antibiotic Misuse & MRL Risk Prediction Backend

Flask API for predicting antibiotic misuse and MRL (Maximum Residue Limit) violations using Machine Learning.

## Features

- **Firebase Firestore Integration**: Fetch treatment data from cloud database
- **ML Predictions**: Logistic Regression model for violation risk assessment
- **Risk Classification**: Low (0-0.4), Moderate (0.4-0.7), High (0.7-1.0)
- **Smart Recommendations**: Actionable advice based on risk level
- **RESTful API**: Clean endpoints for integration with frontend

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as `firebase-service-account.json` in the `backend/` directory

### 3. Prepare ML Models

Place your trained models in the `models/` directory:
- `logistic_regression_model.pkl` - Trained Logistic Regression model
- `scaler.pkl` - StandardScaler for numerical features
- `label_encoders.pkl` - LabelEncoders for categorical variables

### 4. Run the Application

```bash
python app.py
```

Server runs on `http://localhost:5000`

## API Endpoints

### 1. Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "firebase_connected": true,
  "timestamp": "2024-01-15T10:30:00"
}
```

### 2. Predict All Treatments
```
GET /predict-all
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "treatments": [
    {
      "id": "treatment_001",
      "animal_type": "chicken",
      "antibiotic_type": "amoxicillin",
      "dosage_mg": 500,
      "duration_days": 5,
      "days_before_sale": 3,
      "milk_yield": 0,
      "previous_violations": 0,
      "violation_probability": 0.7823,
      "risk_level": "High",
      "recommendation": "⚠️ HIGH RISK: Do NOT sell animal...",
      "timestamp": "2024-01-15T10:30:00"
    }
  ]
}
```

### 3. Predict Single Treatment
```
POST /predict
Content-Type: application/json
```

**Request Body:**
```json
{
  "animal_type": "chicken",
  "antibiotic_type": "amoxicillin",
  "dosage_mg": 500,
  "duration_days": 5,
  "days_before_sale": 3,
  "milk_yield": 0,
  "previous_violations": 0
}
```

**Response:**
```json
{
  "success": true,
  "input_data": { ... },
  "violation_probability": 0.7823,
  "risk_level": "High",
  "recommendation": "⚠️ HIGH RISK: Do NOT sell animal...",
  "timestamp": "2024-01-15T10:30:00"
}
```

## Data Schema

### Treatment Data Structure

| Field | Type | Description |
|-------|------|-------------|
| `animal_type` | string | Type of animal (chicken, cow, goat, etc.) |
| `antibiotic_type` | string | Antibiotic used (amoxicillin, penicillin, etc.) |
| `dosage_mg` | float | Dosage in milligrams |
| `duration_days` | int | Treatment duration in days |
| `days_before_sale` | int | Days between treatment end and sale |
| `milk_yield` | float | Daily milk yield (for dairy animals) |
| `previous_violations` | int | Number of previous MRL violations |

## Risk Levels

- **Low (0-0.4)**: Safe to proceed with normal monitoring
- **Moderate (0.4-0.7)**: Requires extended withdrawal period
- **High (0.7-1.0)**: Do NOT sell, consult veterinarian immediately

## Deployment

### Using Gunicorn (Production)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Docker

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test prediction
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "animal_type": "chicken",
    "antibiotic_type": "amoxicillin",
    "dosage_mg": 500,
    "duration_days": 5,
    "days_before_sale": 3,
    "milk_yield": 0,
    "previous_violations": 0
  }'
```

## Troubleshooting

**Firebase Connection Error:**
- Verify `firebase-service-account.json` exists
- Check Firebase project permissions

**Model Loading Error:**
- Ensure all `.pkl` files are in `models/` directory
- Verify scikit-learn version matches training environment

**CORS Issues:**
- Flask-CORS is enabled by default
- Adjust CORS settings in `app.py` if needed

## Security Notes

- Never commit `firebase-service-account.json` to version control
- Add to `.gitignore`
- Use environment variables for sensitive data in production
- Implement API authentication for production deployment

## License

Educational/Research Project
