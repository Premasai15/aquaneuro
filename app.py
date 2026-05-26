from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# Load model
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    values = [
        data["ph"],
        data["hardness"],
        data["solids"],
        data["chloramines"],
        data["sulfate"],
        data["conductivity"],
        data["organic_carbon"],
        data["trihalomethanes"],
        data["turbidity"]
    ]

    values = scaler.transform([values])
    prediction = model.predict(values)[0]

    return jsonify({"prediction": int(prediction)})

if __name__ == "__main__":
    app.run(debug=True)