import re
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import HashingVectorizer
import joblib
import os

class LogAnalyzer:
    def __init__(self):
        self.vectorizer = HashingVectorizer(n_features=1000, norm=None)
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False
        self.training_data = []
        self.training_buffer_size = 50
        
        # Rule-based patterns
        self.critical_patterns = [
            r'failed password', r'access denied', r'unauthorized', r'panic', r'fatal', r'error'
        ]
        self.anomaly_patterns = [
            r'warning', r'timeout', r'unknown', r'retry'
        ]

    def analyze(self, log_entry):
        """
        Analyzes a log entry and updates its level (Normal, Anomaly, Critical).
        """
        message = log_entry.get('message', '').lower()
        
        # 1. Rule-Based Analysis
        for pattern in self.critical_patterns:
            if re.search(pattern, message):
                log_entry['level'] = 'Critical'
                return log_entry
        
        for pattern in self.anomaly_patterns:
            if re.search(pattern, message):
                log_entry['level'] = 'Anomaly'
                return log_entry

        # 2. AI-Based Analysis (Anomaly Detection)
        if self.is_trained:
            vector = self.vectorizer.transform([message]).toarray()
            prediction = self.model.predict(vector)
            # IsolationForest returns -1 for anomalies, 1 for normal
            if prediction[0] == -1:
                log_entry['level'] = 'Anomaly'
                log_entry['ai_flagged'] = True
        else:
            # Collect data for training
            self.training_data.append(message)
            if len(self.training_data) >= self.training_buffer_size:
                self.train_model()
        
        return log_entry

    def train_model(self):
        print("Training AI Model on collected logs...")
        if not self.training_data:
            return

        X = self.vectorizer.transform(self.training_data).toarray()
        self.model.fit(X)
        self.is_trained = True
        print("AI Model Trained successfully.")
