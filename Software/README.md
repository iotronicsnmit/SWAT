# SWAT - Smart Water Asset Tracking

A real-time water tanker fleet monitoring system built with Next.js, featuring live GPS tracking, water level monitoring, tamper detection, and email alerts.

## Features

### 🚛 Fleet Management
- **Real-time Tracking**: Monitor multiple water tankers simultaneously
- **Live GPS Mapping**: View all tankers on an interactive Google Maps interface
- **Water Level Monitoring**: Track water levels using ultrasonic sensors
- **Status Dashboard**: Overview of fleet statistics, active/inactive tankers, and alerts

### 📊 Monitoring & Analytics
- **Live Data Streaming**: Real-time updates via Server-Sent Events (SSE)
- **Historical Charts**: Water level history with interactive graphs
- **Color-Coded Status**: Visual indicators for water levels (Full, Good, Low, Critical)
- **Individual Tanker Details**: Detailed view with maps, charts, and sensor data

### 🔔 Alerts & Notifications
- **Tamper Detection**: Multi-tanker tamper detection system
- **Email Alerts**: Automated notifications for critical events
- **Email Log Viewer**: Track all sent alerts and notifications
- **Real-time Notifications**: In-app toast notifications for important events

### 🎨 User Interface
- **Modern Design**: Clean, responsive UI with dark theme support
- **Search & Filter**: Quickly find specific tankers
- **Interactive Cards**: Click to view detailed tanker information
- **Real-time Updates**: Live data without page refresh

## Tech Stack

- **Framework**: Next.js 15.2.4 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.9
- **UI Components**: Radix UI + shadcn/ui
- **Maps**: Google Maps API (@react-google-maps/api)
- **Charts**: Recharts
- **Real-time Communication**: MQTT (HiveMQ Cloud)
- **Email Service**: Resend
- **State Management**: SWR for data fetching
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Maps API key
- HiveMQ Cloud account (or any MQTT broker)
- Resend API key (for email alerts)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Software
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with the following:

```env
# MQTT Broker Configuration
HIVEMQ_HOST=hivemq-host.hivemq.cloud
HIVEMQ_PORT=8883
HIVEMQ_USERNAME=your-username
HIVEMQ_PASSWORD=your-password

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Tanker Configuration
NEXT_PUBLIC_TANKER_DEPTH_CM=200

# Email Alerts
RESEND_API_KEY=your-resend-api-key
ALERT_EMAIL=your-email@example.com

# Tamper Detection
TAMPER_TIMEOUT_MS=60000
```

4. Run the development server:
```bash
npm i;
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## MQTT Topic Structure

The system uses a multi-tanker architecture with the following topic patterns:

### Topics per Tanker
- `{TANKER_ID}/gps` - GPS coordinates
- `{TANKER_ID}/distance` - Ultrasonic sensor distance (cm)

### Example
```
T001/gps        → {"lat": 12.9716, "lon": 77.5946}
T001/distance   → 68.5
T002/gps        → {"lat": 13.0827, "lon": 80.2707}
T002/distance   → 120.3
```

## Hardware Integration

### ESP32/Arduino Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* TANKER_ID = "T001";
const char* GPS_TOPIC = "T001/gps";
const char* DISTANCE_TOPIC = "T001/distance";

// Publish GPS data
String gpsJson = "{\"lat\":" + String(latitude, 6) + 
                 ",\"lon\":" + String(longitude, 6) + "}";
client.publish(GPS_TOPIC, gpsJson.c_str());

// Publish distance sensor data
String distanceStr = String(distanceCm);
client.publish(DISTANCE_TOPIC, distanceStr.c_str());
```

## Testing with MQTT

Use any MQTT client (MQTT Explorer, mosquitto_pub, etc.):

```bash
# Publish GPS data
mosquitto_pub -h your-broker.hivemq.cloud -p 8883 \
  -u username -P password --capath /etc/ssl/certs/ \
  -t "T001/gps" -m '{"lat":12.9716,"lon":77.5946}'

# Publish distance data
mosquitto_pub -h your-broker.hivemq.cloud -p 8883 \
  -u username -P password --capath /etc/ssl/certs/ \
  -t "T001/distance" -m "68.5"
```

## Project Structure

```
Software/
├── app/
│   ├── api/
│   │   ├── email-logs/      # Email log API endpoint
│   │   ├── stream/          # SSE endpoint for real-time data
│   │   └── tamper-status/   # Tamper detection status
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── email-logs.tsx       # Email log viewer
│   ├── map.tsx              # Google Maps component
│   ├── tamper-notifications.tsx  # Tamper alert notifications
│   ├── tanker-card.tsx      # Tanker card component
│   ├── tanker-detail-dialog.tsx  # Detailed tanker view
│   ├── water-level-chart.tsx     # Water level chart
│   └── water-level-gauge.tsx     # Water level gauge
├── lib/
│   ├── email-log.ts         # Email logging utilities
│   ├── email-service.ts     # Email sending service
│   ├── mqtt-server.ts       # MQTT client and server logic
│   ├── tamper-detection.ts  # Tamper detection system
│   └── utils.ts             # Utility functions
├── public/                  # Static assets
├── .env                     # Environment variables
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Water Level Calculation

The system calculates water level based on ultrasonic sensor distance:

```
Water Level (cm) = Tank Depth (cm) - Sensor Distance (cm)
Percentage = (Water Level / Tank Depth) × 100
```

### Status Thresholds
- 🟢 **Full** (75-100%): Green
- 🔵 **Good** (50-75%): Blue  
- 🟠 **Low** (25-50%): Orange
- 🔴 **Critical** (0-25%): Red

## Tamper Detection

The system includes a multi-tanker tamper detection feature that:
- Monitors for suspicious water level drops
- Detects rapid decreases in water level
- Sends email alerts when tampering is detected
- Tracks tamper events per tanker
- Displays real-time notifications in the UI

## Email Alerts

Automated email notifications are sent for:
- Tamper detection events
- Critical water levels
- System alerts

View all sent emails in the Email Logs section of the dashboard.

## API Endpoints

- `GET /api/stream` - Server-Sent Events for real-time data
- `GET /api/tamper-status` - Current tamper detection status
- `GET /api/email-logs` - Email notification history


## Troubleshooting

### MQTT Connection Issues
- Verify broker credentials in `.env`
- Check firewall settings for port 8883
- Ensure SSL/TLS certificates are valid

### Map Not Loading
- Verify Google Maps API key is valid
- Enable Maps JavaScript API in Google Cloud Console
- Check browser console for errors

### No Data Showing
- Confirm MQTT broker is publishing data
- Check topic names match the pattern `{TANKER_ID}/gps` and `{TANKER_ID}/distance`
- Verify environment variables are loaded

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Maps powered by [Google Maps Platform](https://developers.google.com/maps)
- MQTT broker by [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/)
