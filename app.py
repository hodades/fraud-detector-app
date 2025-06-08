import pandas as pd
import joblib
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__)

print("Loading scaler and model…")
scaler = joblib.load('scaler.pkl')
model  = joblib.load('credit_card_model.pkl')
print("Artifacts loaded.")

FEATURE_COLS = list(scaler.feature_names_in_)
print(f"Scaler expects these features: {FEATURE_COLS}")

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/demo')
def demo():
    return render_template('demo.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if 'file' in request.files:
            file = request.files['file']
            df = pd.read_csv(file)
            print(f"[Batch] Uploaded CSV columns: {list(df.columns)}")
            X = df[FEATURE_COLS]
            print(f"[Batch] Data shape before scaling: {X.shape}")
            X_scaled = scaler.transform(X)
            probs = model.predict_proba(X_scaled)[:, 1]
            preds = (probs >= 0.5).astype(int)
            results = []
            for idx, (prob, pred) in enumerate(zip(probs, preds)):
                row = df.iloc[idx]
                results.append({
                    'time':       row.get('Time', None),
                    'amount':     row.get('Amount', None),
                    'prediction': int(pred),
                    'probability': float(prob)
                })
            print(f"[Batch] Returning {len(results)} results")
            return jsonify(results)

        data = request.get_json(force=True)
        print(f"[Single] Received JSON: {data}")
        row_dict = {c: data.get(c, 0) for c in FEATURE_COLS}
        df_single = pd.DataFrame([row_dict])
        print(f"[Single] DataFrame columns: {list(df_single.columns)}")
        print(f"[Single] Values before scaling: {df_single.iloc[0].to_dict()}")
        X_scaled = scaler.transform(df_single[FEATURE_COLS])
        prob = model.predict_proba(X_scaled)[0, 1]
        pred = int(prob >= 0.5)
        print(f"[Single] Prediction: {pred}, Probability: {prob:.4f}")
        return jsonify({
            'time':       data.get('Time', None),
            'amount':     data.get('Amount', None),
            'prediction': pred,
            'probability': float(prob)
        })

    except Exception as e:
        print("Error in /api/predict:", str(e))
        return jsonify({'error': str(e)}), 400

@app.route('/static/test_data.csv')
def serve_test_csv():
    return send_from_directory('static', 'test_data.csv', as_attachment=False)

if __name__ == '__main__':
    print("Starting Flask server…")
    app.run(debug=True)
