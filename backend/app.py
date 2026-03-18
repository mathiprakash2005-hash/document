"""
Flask Backend for Antibiotic Misuse & MRL Risk Prediction
Connects to Firebase Firestore and provides ML predictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import joblib
import numpy as np
from datetime import datetime
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🔥 FIREBASE ENV EXISTS:", os.environ.get("FIREBASE_CREDENTIALS") is not None)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global Firebase initialization flag
firebase_initialized = False
db = None

def initialize_firebase():
    """Initialize Firebase connection using service account credentials"""
    global firebase_initialized, db
    if firebase_initialized:
        return True
    
    try:
        # Try environment variable first (for production)
        firebase_json = os.environ.get("FIREBASE_CREDENTIALS")
        
        if firebase_json:
            # Use environment variable
            cred_dict = json.loads(firebase_json)
            cred = credentials.Certificate(cred_dict)
        else:
            # Fallback to JSON file (for local development)
            cred = credentials.Certificate('firebase-service-account.json')
        
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print("\n" + "="*60)
        print("✓ Firebase initialized successfully")
        print("="*60)
        return True
    except Exception as e:
        print("\n" + "="*60)
        print(f"✗ Firebase initialization error: {e}")
        print("="*60)
        return False

# Load trained ML model and preprocessing objects
try:
    model = joblib.load('models/logistic_regression_model.pkl')
    scaler = joblib.load('models/scaler.pkl')
    label_encoders = joblib.load('models/label_encoders.pkl')
    print("✓ ML model and preprocessors loaded successfully")
except Exception as e:
    print(f"✗ Model loading error: {e}")
    model, scaler, label_encoders = None, None, None


def preprocess_data(data):
    """
    Preprocess treatment data for ML model prediction
    
    Args:
        data (dict): Raw treatment data from Firestore or API
    
    Returns:
        np.array: Preprocessed feature array ready for prediction
    """
    try:
        # Extract features in correct order
        features = {
            'animal_type': str(data.get('animal_type', 'chicken')).lower(),
            'antibiotic_type': str(data.get('antibiotic_type', 'amoxicillin')).lower(),
            'dosage_mg': float(data.get('dosage_mg', 0)),
            'duration_days': int(data.get('duration_days', 0)),
            'days_before_sale': int(data.get('days_before_sale', 0)),
            'milk_yield': float(data.get('milk_yield', 0)),
            'previous_violations': int(data.get('previous_violations', 0))
        }
        
        # Encode categorical variables with error handling
        try:
            animal_encoded = label_encoders['animal_type'].transform([features['animal_type']])[0]
        except:
            # If unknown animal type, use first class
            animal_encoded = 0
            
        try:
            antibiotic_encoded = label_encoders['antibiotic_type'].transform([features['antibiotic_type']])[0]
        except:
            # If unknown antibiotic, use first class
            antibiotic_encoded = 0
        
        # Create feature array
        feature_array = np.array([[
            animal_encoded,
            antibiotic_encoded,
            features['dosage_mg'],
            features['duration_days'],
            features['days_before_sale'],
            features['milk_yield'],
            features['previous_violations']
        ]])
        
        # Scale numerical features (columns 2-6)
        feature_array[:, 2:] = scaler.transform(feature_array[:, 2:])
        
        return feature_array
    except Exception as e:
        print(f"[PREPROCESS ERROR] {str(e)}")
        print(f"[DATA] {data}")
        raise


def get_risk_level(probability):
    """
    Determine risk level based on violation probability
    
    Args:
        probability (float): Predicted violation probability (0-1)
    
    Returns:
        str: Risk level (Low, Moderate, High)
    """
    if probability < 0.4:
        return "Low"
    elif probability < 0.7:
        return "Moderate"
    else:
        return "High"


def generate_recommendation(probability, data):
    """
    Generate actionable recommendation based on risk level
    
    Args:
        probability (float): Predicted violation probability
        data (dict): Treatment data
    
    Returns:
        str: Recommendation message
    """
    risk = get_risk_level(probability)
    
    if risk == "Low":
        return "Safe to proceed. Continue monitoring withdrawal period."
    
    elif risk == "Moderate":
        recommendations = []
        
        if data.get('days_before_sale', 0) < 7:
            recommendations.append("Extend withdrawal period by at least 3-5 days")
        
        if data.get('dosage_mg', 0) > 500:
            recommendations.append("Consider reducing dosage in consultation with veterinarian")
        
        if data.get('previous_violations', 0) > 0:
            recommendations.append("Implement stricter monitoring due to previous violations")
        
        return " | ".join(recommendations) if recommendations else "Increase monitoring frequency and extend withdrawal period"
    
    else:  # High risk
        return "⚠️ HIGH RISK: Do NOT sell animal. Consult veterinarian immediately. Extend withdrawal period by minimum 10-14 days and retest."


def predict_single(data):
    """
    Make prediction for a single treatment entry
    
    Args:
        data (dict): Treatment data
    
    Returns:
        dict: Prediction results with probability, risk level, and recommendation
    """
    if not model:
        return {"error": "Model not loaded"}
    
    try:
        # Preprocess data
        features = preprocess_data(data)
        
        # Predict violation probability
        probability = model.predict_proba(features)[0][1]  # Probability of class 1 (violation)
        
        # Get risk level
        risk = get_risk_level(probability)
        
        # Generate recommendation
        recommendation = generate_recommendation(probability, data)
        
        return {
            "violation_probability": round(float(probability) * 100, 2),
            "risk_level": risk,
            "recommendation": recommendation,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        return {"error": str(e)}


@app.route('/predict-all', methods=['GET'])
def predict_all():
    """
    Fetch all treatments from Firestore and predict risk for each
    
    Returns:
        JSON: List of all treatments with predictions
    """
    print("\n[REQUEST] GET /predict-all - Fetching all treatments...")
    try:
        if not firebase_initialized or db is None:
            if not initialize_firebase():
                return jsonify({"success": False, "error": "Firebase not initialized"}), 500
        
        treatments_ref = db.collection('treatments')
        docs = treatments_ref.stream()
        
        results = []
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            prediction = predict_single(data)
            result = {**data, **prediction}
            results.append(result)
        
        print(f"[SUCCESS] Processed {len(results)} treatments")
        return jsonify({
            "success": True,
            "count": len(results),
            "treatments": results
        }), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict risk for a new treatment entry
    
    Request Body:
        JSON with treatment data (animal_type, antibiotic_type, dosage_mg, etc.)
    
    Returns:
        JSON: Prediction results
    """
    print("\n[REQUEST] POST /predict - New prediction request")
    try:
        data = request.get_json()
        
        if not data:
            print("[ERROR] No data provided")
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        required_fields = ['animal_type', 'antibiotic_type', 'dosage_mg', 'duration_days', 'days_before_sale']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"[ERROR] Missing fields: {missing_fields}")
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        prediction = predict_single(data)
        
        if "error" in prediction:
            print(f"[ERROR] Prediction failed: {prediction['error']}")
            return jsonify({"success": False, "error": prediction["error"]}), 500
        
        print(f"[SUCCESS] Risk: {prediction['risk_level']}, Probability: {prediction['violation_probability']}")
        return jsonify({"success": True, "input_data": data, **prediction}), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API is running"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "firebase_connected": firebase_admin._apps != {},
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def home():
    """Root endpoint with API documentation"""
    return jsonify({
        "message": "Antibiotic Misuse & MRL Risk Prediction API",
        "endpoints": {
            "/health": "GET - Health check",
            "/predict-all": "GET - Predict risk for all Firestore treatments",
            "/predict": "POST - Predict risk for new treatment data",
            "/api/chat": "POST - AI veterinary chatbot (context-aware Q&A)"
        },
        "version": "1.1.0"
    }), 200


@app.route('/test', methods=['GET'])
def test():
    """Simple test endpoint"""
    return jsonify({"message": "Flask server is working!"}), 200


@app.route("/api/chat", methods=["POST"])
def openrouter_chat():
    """Smart context-aware chat endpoint for VetBot with database integration"""
    print("\n[CHAT] Endpoint called")
    
    try:
        data = request.json
        user_message = data.get("message")
        language = data.get("language", "english")
        farmer_id = data.get("farmerId")
        
        print("USER MESSAGE:", user_message)
        print("LANGUAGE:", language)
        print("FARMER ID:", farmer_id)
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        # Get OpenRouter API key
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            return jsonify({"error": "OpenRouter API key not configured"}), 500
        
        # Classify intent and extract entities
        intent, entity = classify_intent(user_message)
        print(f"INTENT: {intent}, ENTITY: {entity}")
        
        # Handle database queries if farmer_id provided
        context_data = None
        if farmer_id and intent in ['animal_status', 'withdrawal_check', 'treatment_history', 'risk_prediction', 'farm_overview']:
            context_data = handle_database_query(farmer_id, intent, entity)
            print(f"CONTEXT DATA: {context_data}")
            
            # If we have context data, return it directly without AI processing for structured queries
            if context_data and intent != 'general_question':
                # For data queries, AI should format the raw data nicely
                user_message = f"Format this farm data in a clear, friendly way for the farmer:\n\n{context_data}\n\nOriginal question: {user_message}"
        
        # Detect if message contains Tamil characters
        has_tamil = any('\u0B80' <= char <= '\u0BFF' for char in user_message)
        
        # Build system prompt with context
        if has_tamil or language == "tamil":
            system_prompt = """You are VetFarm AI Assistant, a smart veterinary and farm management chatbot.
            
            IMPORTANT: The user is speaking in Tamil. You MUST respond in Tamil language (தமிழ்).
            Use simple farmer-friendly Tamil words.
            
            Your job is to:
            1. Format farm data clearly and professionally
            2. Provide veterinary advice when asked
            3. Explain withdrawal periods and safety
            4. Give actionable recommendations
            
            When farm data is provided, present it in a clear, organized way.
            Add helpful context and explanations.
            Always prioritize farmer safety and animal health.
            
            Always recommend consulting a licensed veterinarian for medical decisions."""
        else:
            system_prompt = """You are VetFarm AI Assistant, a smart veterinary and farm management chatbot.
            
            Your job is to:
            1. Format farm data clearly and professionally
            2. Provide veterinary advice when asked
            3. Explain withdrawal periods and safety
            4. Give actionable recommendations
            
            When farm data is provided, present it in a clear, organized way.
            Add helpful context and explanations.
            Always prioritize farmer safety and animal health.
            
            Always recommend consulting a licensed veterinarian for medical decisions."""
        
        # Remove the context data addition to system prompt since we're now including it in user message
        
        print("Making OpenRouter API request...")
        
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )

        models = [
            "openai/gpt-4o-mini",
            "mistralai/mistral-7b-instruct",
            "meta-llama/llama-3.1-8b-instruct"
        ]

        response_text = None
        last_error = None

        for model_name in models:
            try:
                print(f"Trying model: {model_name}")

                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.4,
                    max_tokens=500
                )

                response_text = completion.choices[0].message.content
                print(f"✓ Response from {model_name}")
                break

            except Exception as e:
                print(f"Model {model_name} failed:", e)
                last_error = e

        if not response_text:
            raise Exception(f"All models failed: {last_error}")

        print("Response received successfully")
        
        return jsonify({
            "response": response_text,
            "intent": intent,
            "contextData": context_data
        })

    except Exception as e:
        print("[CHAT ERROR]", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def classify_intent(message):
    """Classify user intent and extract entities"""
    message_lower = message.lower()
    
    # Intent patterns
    intents = {
        'animal_status': ['status', 'எப்படி', 'நிலை', 'how is', 'condition'],
        'withdrawal_check': ['sell', 'விற்க', 'safe', 'விற்பனை', 'can i sell', 'ready to sell'],
        'treatment_history': ['treatment', 'medicine', 'மருந்து', 'history', 'சிகிச்சை'],
        'risk_prediction': ['risk', 'mrl', 'violation', 'probability'],
        'farm_overview': ['my animals', 'என் விலங்குகள்', 'total', 'எத்தனை', 'how many', 'list', 'all animals', 'அனைத்து விலங்குகள்', 'பட்டியல்', 'list all']
    }
    
    # Check for animal ID patterns (COW-01, CHICKEN-03, etc.)
    import re
    animal_id_match = re.search(r'(COW|CHICKEN|GOAT)-\d+', message, re.IGNORECASE)
    entity = animal_id_match.group(0).upper() if animal_id_match else None
    
    # Classify intent
    for intent, keywords in intents.items():
        if any(keyword in message_lower for keyword in keywords):
            return intent, entity
    
    return 'general_question', entity


def handle_database_query(farmer_id, intent, entity):
    """Query Firestore based on intent and return formatted data"""
    try:
        if not firebase_initialized or db is None:
            initialize_firebase()
        
        if intent == 'animal_status' and entity:
            return get_animal_status(farmer_id, entity)
        
        elif intent == 'withdrawal_check' and entity:
            return check_withdrawal_safety(farmer_id, entity)
        
        elif intent == 'treatment_history' and entity:
            return get_treatment_history(farmer_id, entity)
        
        elif intent == 'risk_prediction' and entity:
            return get_mrl_risk_prediction(farmer_id, entity)
        
        elif intent == 'farm_overview':
            return get_farm_overview(farmer_id)
        
        return None
    
    except Exception as e:
        print(f"[DATABASE QUERY ERROR] {str(e)}")
        return None


def get_animal_status(farmer_id, animal_id):
    """Get detailed status of a specific animal"""
    try:
        animals_ref = db.collection('animals')
        query = animals_ref.where('farmerId', '==', farmer_id).where('animalId', '==', animal_id)
        docs = list(query.stream())
        
        if not docs:
            return f"Animal {animal_id} not found in your farm."
        
        animal = docs[0].to_dict()
        
        # Get active treatments
        treatments_ref = db.collection('treatments')
        treatment_query = treatments_ref.where('farmerId', '==', farmer_id).where('animalId', '==', animal_id)
        treatments = list(treatment_query.stream())
        
        active_treatment = None
        for t in treatments:
            t_data = t.to_dict()
            if t_data.get('injectionDate'):
                injection_date = t_data['injectionDate'].replace(tzinfo=None) if hasattr(t_data['injectionDate'], 'replace') else t_data['injectionDate']
                withdrawal_days = int(t_data.get('withdrawalDays', 0))
                from datetime import timedelta
                withdrawal_end = injection_date + timedelta(days=withdrawal_days)
                
                if withdrawal_end > datetime.now():
                    days_remaining = (withdrawal_end - datetime.now()).days
                    active_treatment = {
                        'medicine': t_data.get('antibioticName', 'Unknown'),
                        'dosage': t_data.get('dosage', 'N/A'),
                        'injection_date': injection_date.strftime('%Y-%m-%d'),
                        'withdrawal_end': withdrawal_end.strftime('%Y-%m-%d'),
                        'days_remaining': days_remaining
                    }
                    break
        
        result = f"""Animal ID: {animal_id}
Species: {animal.get('speciesDisplay', 'Unknown')}
Status: {animal.get('status', 'Unknown')}
"""
        
        if active_treatment:
            result += f"""\nACTIVE TREATMENT:
Medicine: {active_treatment['medicine']}
Dosage: {active_treatment['dosage']}
Injection Date: {active_treatment['injection_date']}
Withdrawal Ends: {active_treatment['withdrawal_end']}
Days Remaining: {active_treatment['days_remaining']}

WARNING: Do NOT sell this animal yet."""
        else:
            result += "\nNo active treatments. Animal may be safe to sell."
        
        return result
    
    except Exception as e:
        print(f"[GET ANIMAL STATUS ERROR] {str(e)}")
        return f"Error retrieving status for {animal_id}"


def check_withdrawal_safety(farmer_id, animal_id):
    """Check if animal is safe to sell based on withdrawal period"""
    try:
        treatments_ref = db.collection('treatments')
        query = treatments_ref.where('farmerId', '==', farmer_id).where('animalId', '==', animal_id)
        treatments = list(query.stream())
        
        if not treatments:
            return f"{animal_id}: No treatment records found. Likely safe to sell, but verify with veterinarian."
        
        for t in treatments:
            t_data = t.to_dict()
            if t_data.get('injectionDate'):
                injection_date = t_data['injectionDate'].replace(tzinfo=None) if hasattr(t_data['injectionDate'], 'replace') else t_data['injectionDate']
                withdrawal_days = int(t_data.get('withdrawalDays', 0))
                from datetime import timedelta
                withdrawal_end = injection_date + timedelta(days=withdrawal_days)
                
                if withdrawal_end > datetime.now():
                    days_remaining = (withdrawal_end - datetime.now()).days
                    return f"""⚠️ WARNING - {animal_id} NOT SAFE TO SELL

Withdrawal Period: ACTIVE
Medicine: {t_data.get('antibioticName', 'Unknown')}
Withdrawal Ends: {withdrawal_end.strftime('%Y-%m-%d')}
Days Remaining: {days_remaining}

Do NOT sell this animal until withdrawal period completes."""
        
        return f"""✅ {animal_id} - SAFE TO SELL

Withdrawal Status: Completed
No active treatments found.

This animal appears safe for sale. Consider generating a certificate."""
    
    except Exception as e:
        print(f"[WITHDRAWAL CHECK ERROR] {str(e)}")
        return f"Error checking withdrawal status for {animal_id}"


def get_treatment_history(farmer_id, animal_id):
    """Get treatment history for an animal"""
    try:
        treatments_ref = db.collection('treatments')
        query = treatments_ref.where('farmerId', '==', farmer_id).where('animalId', '==', animal_id)
        treatments = list(query.stream())
        
        if not treatments:
            return f"No treatment history found for {animal_id}."
        
        result = f"Treatment History - {animal_id}:\n\n"
        
        for idx, t in enumerate(treatments, 1):
            t_data = t.to_dict()
            injection_date = t_data.get('injectionDate')
            date_str = injection_date.strftime('%Y-%m-%d') if injection_date else 'Unknown'
            
            result += f"""{idx}. Date: {date_str}
   Medicine: {t_data.get('antibioticName', 'Unknown')}
   Dosage: {t_data.get('dosage', 'N/A')}
   Withdrawal Days: {t_data.get('withdrawalDays', 'N/A')}
   Purpose: {t_data.get('purpose', 'N/A')}

"""
        
        result += f"Total Treatments: {len(treatments)}"
        return result
    
    except Exception as e:
        print(f"[TREATMENT HISTORY ERROR] {str(e)}")
        return f"Error retrieving treatment history for {animal_id}"


def get_mrl_risk_prediction(farmer_id, animal_id):
    """Get ML-based MRL risk prediction for an animal"""
    try:
        # Get latest treatment data
        treatments_ref = db.collection('treatments')
        query = treatments_ref.where('farmerId', '==', farmer_id).where('animalId', '==', animal_id)
        treatments = list(query.stream())
        
        if not treatments:
            return f"No treatment data available for {animal_id} to predict risk."
        
        # Get most recent treatment
        latest_treatment = treatments[-1].to_dict()
        
        # Prepare data for ML model
        prediction_data = {
            'animal_type': latest_treatment.get('animalType', 'chicken'),
            'antibiotic_type': latest_treatment.get('antibioticName', 'amoxicillin').lower(),
            'dosage_mg': float(latest_treatment.get('dosage', '0').split()[0]) if latest_treatment.get('dosage') else 0,
            'duration_days': int(latest_treatment.get('withdrawalDays', 0)),
            'days_before_sale': 0,
            'milk_yield': 0,
            'previous_violations': 0
        }
        
        # Get prediction
        prediction = predict_single(prediction_data)
        
        if 'error' in prediction:
            return f"Unable to predict risk: {prediction['error']}"
        
        risk_level = prediction['risk_level']
        probability = prediction['violation_probability']
        recommendation = prediction['recommendation']
        
        return f"""MRL RISK PREDICTION - {animal_id}

Risk Level: {risk_level}
Violation Probability: {probability}%

Recommendation:
{recommendation}"""
    
    except Exception as e:
        print(f"[RISK PREDICTION ERROR] {str(e)}")
        return f"Error predicting risk for {animal_id}"


def get_farm_overview(farmer_id):
    """Get overview of farmer's entire farm"""
    try:
        animals_ref = db.collection('animals')
        query = animals_ref.where('farmerId', '==', farmer_id)
        animals = list(query.stream())
        
        if not animals:
            return "No animals found in your farm. Add animals to get started."
        
        total = len(animals)
        healthy = sum(1 for a in animals if a.to_dict().get('status') == 'Healthy')
        withdrawal = sum(1 for a in animals if a.to_dict().get('status') == 'Withdrawal')
        
        result = f"""FARM OVERVIEW

Total Animals: {total}
Healthy: {healthy}
Under Withdrawal: {withdrawal}

Animals:
"""
        
        for a in animals:
            a_data = a.to_dict()
            result += f"- {a_data.get('animalId')}: {a_data.get('speciesDisplay')} ({a_data.get('status')})\n"
        
        return result
    
    except Exception as e:
        print(f"[FARM OVERVIEW ERROR] {str(e)}")
        return "Error retrieving farm overview"


@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    """Text-to-Speech endpoint using Google TTS for Tamil language"""
    print("\n[TTS] Endpoint called")
    
    try:
        from gtts import gTTS
        from io import BytesIO
        
        data = request.json
        text = data.get("text")
        language = data.get("language", "ta")  # Default to Tamil
        
        print(f"TTS TEXT: {text[:50]}...")
        print(f"TTS LANGUAGE: {language}")
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Generate speech using gTTS
        tts = gTTS(text=text, lang=language, slow=False)
        
        # Save to BytesIO buffer
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        print("[TTS] Audio generated successfully")
        
        # Return audio file
        from flask import send_file
        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
    
    except ImportError:
        print("[TTS ERROR] gTTS not installed")
        return jsonify({
            "error": "gTTS library not installed. Run: pip install gtts"
        }), 500
    
    except Exception as e:
        print(f"[TTS ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("\n" + "#"*60)
    print("#" + " "*58 + "#")
    print("#  Antibiotic Misuse & MRL Risk Prediction API" + " "*13 + "#")
    print("#" + " "*58 + "#")
    print("#"*60)
    
    # Initialize Firebase on startup
    initialize_firebase()
    
    # Check model status
    if model:
        print("✓ ML Model Status: LOADED")
    else:
        print("✗ ML Model Status: NOT LOADED")
    
    print("\n" + "="*60)
    print("🚀 Starting Flask Server...")
    print("="*60)
    print(f"📍 Server URL: http://localhost:5000")
    print(f"📍 Health Check: http://localhost:5000/health")
    print(f"📍 API Docs: http://localhost:5000/")
    print("="*60 + "\n")
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
