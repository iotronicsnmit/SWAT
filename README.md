# SWAT - Smart Water Asset Tracking System

A complete IoT solution for real-time water tanker fleet monitoring, featuring GPS tracking, water level monitoring, tamper detection, and automated alerts.

## 📺 Demo & Simulation

- **Video Demo**: Watch the system in action: [SWAT Demo on YouTube](https://youtu.be/Gl9nbqIaxvQ)
- **Hardware Simulation**: Try the hardware simulation: [Wokwi Simulator](https://wokwi.com/projects/444181553182324737)

## 🎯 Overview

SWAT is an end-to-end water tanker monitoring system that combines hardware sensors with a modern web dashboard to provide real-time visibility into your water tanker fleet. The system tracks GPS location, monitors water levels using ultrasonic sensors, detects tampering, and sends automated email alerts.

### Key Capabilities

- **Real-time GPS Tracking**: Monitor the location of all tankers on an interactive map
- **Water Level Monitoring**: Track water levels with ultrasonic sensors
- **Tamper Detection**: Automated detection of suspicious water level drops
- **Email Alerts**: Instant notifications for critical events
- **Fleet Dashboard**: Comprehensive overview of all tankers and their status
- **Historical Data**: Charts and logs for analysis and reporting

## 🏗️ Project Structure

```
SWAT/
├── Hardware/           # Arduino/ESP32 firmware and sensor code
│   ├── altsoftserialcode.c
│   ├── gcorrectlocation.c
│   └── gpslocationloop.c
│
└── Software/          # Next.js web dashboard
    ├── app/           # Next.js app router pages
    ├── components/    # React components
    ├── lib/           # Utilities and services
    └── public/        # Static assets
```

## 🔧 Hardware Components

### Required Components per Tanker

- **Microcontroller**: ESP32 or Arduino with WiFi/GSM module
- **GPS Module**: NEO-6M or similar for location tracking
- **Ultrasonic Sensor**: HC-SR04 or JSN-SR04T for water level measurement
- **Power Supply**: 12V battery or vehicle power adapter
- **Enclosure**: Waterproof housing for electronics

### Hardware Setup

1. **GPS Module**: Connect to serial pins for location data
2. **Ultrasonic Sensor**: Mount at the top of the water tank
   - Trigger pin → GPIO pin
   - Echo pin → GPIO pin
   - VCC → 5V
   - GND → Ground
3. **ESP32/Arduino**: Program with the firmware from `/Hardware` directory
4. **Power**: Connect to stable 12V power source

### Wiring Diagram

```
ESP32/Arduino
├── GPS Module (TX/RX)
├── Ultrasonic Sensor (Trig/Echo)
├── Power (12V → 5V regulator)
└── WiFi/GSM Module (if separate)
```

## 💻 Software Dashboard

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Maps**: Google Maps API
- **Charts**: Recharts
- **Real-time**: MQTT (HiveMQ), Server-Sent Events
- **Email**: Resend API
- **State Management**: SWR

### Features

#### Dashboard Overview
- Fleet statistics (total, active, inactive tankers)
- Average water level across fleet
- Low and critical level alerts
- Search and filter functionality

#### Real-time Monitoring
- Live GPS tracking on interactive map
- Water level gauges and charts
- Color-coded status indicators
- Automatic updates without page refresh

#### Tamper Detection
- Multi-tanker tamper monitoring
- Suspicious water level drop detection
- Automated email alerts
- Event logging and history

#### Individual Tanker View
- Detailed tanker information
- Location map with path history
- Water level history chart
- Sensor data and status

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google Maps API key
- MQTT broker (HiveMQ Cloud account)
- Resend API key (for email alerts)
- Arduino IDE or PlatformIO (for hardware)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd SWAT
```

#### 2. Hardware Setup

```bash
cd Hardware
# Open .c files in Arduino IDE
# Configure WiFi credentials and MQTT broker details
# Upload to ESP32/Arduino
```

#### 3. Software Setup

```bash
cd Software
npm install
```

#### 4. Configure Environment Variables

Create `Software/.env`:

```env
# MQTT Broker
HIVEMQ_HOST=your-broker.hivemq.cloud
HIVEMQ_PORT=8883
HIVEMQ_USERNAME=your-username
HIVEMQ_PASSWORD=your-password

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key

# Tanker Configuration
NEXT_PUBLIC_TANKER_DEPTH_CM=200

# Email Alerts
RESEND_API_KEY=your-resend-api-key
ALERT_EMAIL=your-email@example.com

# Tamper Detection
TAMPER_TIMEOUT_MS=60000
```

#### 5. Run the Dashboard

```bash
cd Software
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📡 MQTT Communication

### Topic Structure

Each tanker publishes to two topics:

```
{TANKER_ID}/gps        → GPS coordinates
{TANKER_ID}/distance   → Ultrasonic sensor reading (cm)
```

### Message Formats

**GPS Topic** (`T001/gps`):
```json
{
  "lat": 12.9716,
  "lon": 77.5946
}
```

**Distance Topic** (`T001/distance`):
```
68.5
```

### Example Hardware Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* TANKER_ID = "T001";
const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASSWORD = "your-password";
const char* MQTT_SERVER = "broker.hivemq.cloud";
const int MQTT_PORT = 8883;

WiFiClient espClient;
PubSubClient client(espClient);

void publishGPS(float lat, float lon) {
  String topic = String(TANKER_ID) + "/gps";
  String payload = "{\"lat\":" + String(lat, 6) + 
                   ",\"lon\":" + String(lon, 6) + "}";
  client.publish(topic.c_str(), payload.c_str());
}

void publishDistance(float distance) {
  String topic = String(TANKER_ID) + "/distance";
  String payload = String(distance);
  client.publish(topic.c_str(), payload.c_str());
}
```

## 🧪 Testing

### Test with MQTT Client

```bash
# Test GPS data
mosquitto_pub -h your-broker.hivemq.cloud -p 8883 \
  -u username -P password --capath /etc/ssl/certs/ \
  -t "T001/gps" -m '{"lat":12.9716,"lon":77.5946}'

# Test distance data
mosquitto_pub -h your-broker.hivemq.cloud -p 8883 \
  -u username -P password --capath /etc/ssl/certs/ \
  -t "T001/distance" -m "68.5"
```

### Add Multiple Tankers

Simply change the tanker ID and publish to new topics:
- `T002/gps` and `T002/distance`
- `T003/gps` and `T003/distance`
- etc.

## 📊 Water Level Calculation

```
Water Level (cm) = Tank Depth - Sensor Distance
Percentage = (Water Level / Tank Depth) × 100
```

### Status Thresholds

| Status | Range | Color |
|--------|-------|-------|
| Full | 75-100% | 🟢 Green |
| Good | 50-75% | 🔵 Blue |
| Low | 25-50% | 🟠 Orange |
| Critical | 0-25% | 🔴 Red |

## 🔔 Alert System

### Tamper Detection

The system monitors for:
- Rapid water level drops
- Unusual patterns in sensor data
- Disconnected sensors

### Email Notifications

Automated emails are sent for:
- Tamper detection events
- Critical water levels (< 25%)
- Sensor disconnections
- System errors

View all alerts in the Email Logs section of the dashboard.

## 📱 API Endpoints

- `GET /api/stream` - Real-time data stream (SSE)
- `GET /api/tamper-status` - Current tamper detection status
- `GET /api/email-logs` - Email notification history

## 🚢 Deployment

### Software Dashboard

### Hardware Deployment

1. Flash firmware to each ESP32/Arduino
2. Configure unique tanker IDs (T001, T002, etc.)
3. Mount sensors in water tanks
4. Connect to power supply
5. Verify MQTT connection and data transmission

## 🛠️ Troubleshooting

### Hardware Issues

**GPS not getting fix:**
- Ensure clear view of sky
- Wait 2-5 minutes for initial fix
- Check antenna connection

**Ultrasonic sensor not reading:**
- Verify wiring connections
- Check power supply (5V)
- Ensure sensor is mounted correctly

**MQTT not connecting:**
- Verify WiFi credentials
- Check broker URL and port
- Confirm SSL/TLS settings

### Software Issues

**Dashboard not showing data:**
- Check MQTT broker connection
- Verify topic names match pattern
- Inspect browser console for errors

**Map not loading:**
- Verify Google Maps API key
- Enable Maps JavaScript API
- Check API quotas

**Email alerts not working:**
- Confirm Resend API key is valid
- Check email address configuration
- Review email logs for errors

## 📖 Documentation

- [Software README](Software/README.md) - Detailed dashboard documentation
- [Multi-Tanker Setup Guide](Software/MULTI_TANKER_SETUP.md) - Implementation guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- **Next.js** - React framework
- **shadcn/ui** - UI component library
- **Google Maps Platform** - Mapping services
- **HiveMQ Cloud** - MQTT broker
- **Resend** - Email service
- **Recharts** - Charting library

## 📧 Support

For issues, questions, or feature requests, please open an issue in the repository.

## 🎥 Demo & Resources

- **Video Demo**: [https://youtu.be/Gl9nbqIaxvQ](https://youtu.be/Gl9nbqIaxvQ)
- **Hardware Simulation**: [https://wokwi.com/projects/444181553182324737](https://wokwi.com/projects/444181553182324737)

---

**Built with ❤️ for efficient water management**
