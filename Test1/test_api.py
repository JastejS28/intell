#!/usr/bin/env python3
"""
Simple test script to verify the FastAPI endpoints work correctly
"""

import requests
import json
from datetime import datetime

# Base URL for the API
BASE_URL = "http://127.0.0.1:8002"

def test_predict_endpoint():
    """Test the /predict/ endpoint"""
    print("Testing /predict/ endpoint...")
    
    # Sample vital signs data
    test_data = {
        "Heart_Rate": 85.0,
        "Respiratory_Rate": 18.0,
        "Body_Temperature": 98.6,
        "Oxygen_Saturation": 98,
        "Systolic_Blood_Pressure": 120,
        "Diastolic_Blood_Pressure": 80,
        "Age": 45.0,
        "Gender": 1,
        "Weight_kg": 70.0,
        "Height_m": 1.75,
        "Derived_HRV": 45.0,
        "Derived_Pulse_Pressure": 40.0,
        "Derived_BMI": 22.9,
        "Derived_MAP": 93.3
    }
    
    try:
        response = requests.post(f"{BASE_URL}/predict/", json=test_data)
        if response.status_code == 200:
            result = response.json()
            print("✅ /predict/ endpoint working!")
            print(f"   Risk Level: {result.get('risk_level')}")
            print(f"   Confidence: {result.get('confidence_score'):.3f}")
            print(f"   Priority Score: {result.get('priority_score'):.1f}")
            return True
        else:
            print(f"❌ /predict/ endpoint failed with status {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ /predict/ endpoint error: {e}")
        return False

def test_queue_endpoint():
    """Test the /queue/ endpoint"""
    print("\nTesting /queue/ endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/")
        if response.status_code == 200:
            result = response.json()
            print("✅ /queue/ endpoint working!")
            print(f"   Patients in queue: {len(result)}")
            if result:
                print(f"   First patient risk: {result[0].get('risk_level')}")
            return True
        else:
            print(f"❌ /queue/ endpoint failed with status {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ /queue/ endpoint error: {e}")
        return False

def test_next_patient_endpoint():
    """Test the /queue/next/ endpoint"""
    print("\nTesting /queue/next/ endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/queue/next/")
        if response.status_code == 200:
            result = response.json()
            print("✅ /queue/next/ endpoint working!")
            print(f"   Next patient: {result.get('patient_id')}")
            print(f"   Risk level: {result.get('risk_level')}")
            return True
        elif response.status_code == 404:
            print("✅ /queue/next/ endpoint working (no patients available)!")
            return True
        else:
            print(f"❌ /queue/next/ endpoint failed with status {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ /queue/next/ endpoint error: {e}")
        return False

def test_root_endpoint():
    """Test the root endpoint"""
    print("Testing root endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            result = response.json()
            print("✅ Root endpoint working!")
            print(f"   Message: {result.get('message')}")
            return True
        else:
            print(f"❌ Root endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting API tests...\n")
    
    tests = [
        test_root_endpoint,
        test_predict_endpoint,
        test_queue_endpoint,
        test_next_patient_endpoint,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
