/**
 * Smart Building Digital Twin - ESP32 MQ-2 Smoke Sensor Firmware
 * 
 * This sketch connects an ESP32 microcontroller to local Wi-Fi, reads analog smoke level 
 * telemetry from an MQ-2 smoke/gas sensor, and sends periodic updates to the central 
 * backend server via HTTP POST.
 * 
 * Hardware Connection:
 *   - ESP32 GPIO 34 (Analog Input A6) <---> MQ-2 Analog Out (AO)
 *   - ESP32 GND                       <---> MQ-2 GND
 *   - ESP32 5V (or 3V3)                <---> MQ-2 VCC (MQ-2 performs best at 5V)
 */

#include <WiFi.h>
#include <HTTPClient.h>

// WiFi Configuration Settings
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend API Configuration
// Replace with your local machine's IP address (e.g. "http://192.168.1.50:5000/api/sensors/telemetry")
const char* serverUrl = "http://localhost:5000/api/sensors/telemetry"; 
const char* sensorId  = "SN-001"; // ID corresponding to "Server Room" in database seed

// MQ-2 Pins & Settings
const int MQ2_PIN = 34; // GPIO Pin 34 (ADC1_CH6)
const int READ_INTERVAL_MS = 3000; // Send telemetry update every 3 seconds

unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(MQ2_PIN, INPUT);

  // Initialize Wi-Fi Connection
  Serial.println("");
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected successfully!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Check read timer interval
  if (millis() - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = millis();

    // Verify WiFi status is connected
    if (WiFi.status() == WL_CONNECTED) {
      
      // Read analog smoke value (ESP32 ADC scale is 0 to 4095)
      // Note: MQ-2 sensor outputs 0-5V. ESP32 pins are 3.3V tolerant.
      // A voltage divider or calibration is recommended. For local prototype, we read analog value.
      int rawValue = analogRead(MQ2_PIN);
      
      // Map/calibrate raw ESP32 reading (0-4095) to typical 0-1023 Arduino MQ-2 range
      int smokeLevel = map(rawValue, 0, 4095, 0, 1023);

      Serial.print("Raw Sensor Value: ");
      Serial.print(rawValue);
      Serial.print(" | Calibrated Smoke Level: ");
      Serial.print(smokeLevel);
      Serial.println(" ppm");

      // Prepare HTTP client
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      // Construct JSON payload
      // Schema: { "sensorId": "SN-001", "smokeLevel": 120 }
      String jsonPayload = "{\"sensorId\":\"" + String(sensorId) + "\",\"smokeLevel\":" + String(smokeLevel) + "}";

      Serial.print("Sending HTTP POST payload: ");
      Serial.println(jsonPayload);

      // Execute POST request
      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("HTTP Response Code: ");
        Serial.println(httpResponseCode);
        Serial.print("Server Response Content: ");
        Serial.println(response);
      } else {
        Serial.print("Error sending POST request. HTTP Error Code: ");
        Serial.println(httpResponseCode);
      }

      // Close HTTP client connection
      http.end();
      
    } else {
      Serial.println("WiFi Disconnected! Attempting reconnection...");
      WiFi.begin(ssid, password);
    }
  }
}
