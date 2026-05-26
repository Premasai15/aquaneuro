import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
import joblib

# Step 1: Load dataset
data = pd.read_csv("water_potability.csv")

# Step 2: Handle missing values
data = data.dropna()

# Step 3: Split features & target
X = data.drop("Potability", axis=1)
y = data["Potability"]

# Step 4: Normalize data (VERY IMPORTANT)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Step 5: Split train & test
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# Step 6: Train ANN model
model = MLPClassifier(hidden_layer_sizes=(10, 10), max_iter=500)
model.fit(X_train, y_train)

# Step 7: Check accuracy
accuracy = model.score(X_test, y_test)
print("Model Accuracy:", accuracy)

# Step 8: Save model & scaler
joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("Model saved successfully!")