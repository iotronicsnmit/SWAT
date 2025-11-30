// This code integrates the SIM A7672S GNSS module with an HC-SR04 ultrasonic sensor,
// providing a refined output of only the essential GPS and "Water Level" (distance) data.
//
// GNSS Module (SIM A7672S) connection using AltSoftSerial:
//   - A7672S TX  -> Arduino Pin 9 (AltSoftSerial RX)
//   - A7672S RX  -> Arduino Pin 8 (AltSoftSerial TX)
//
// HC-SR04 Ultrasonic Sensor connection:
//   - HC-SR04 Trigger -> Arduino Pin 10
//   - HC-SR04 Echo     -> Arduino Pin 11

#include <AltSoftSerial.h>
AltSoftSerial altSerial; // RX=9, TX=8

// --- HC-SR04 DEFINITIONS ---
#define TRIGGER_PIN 10
#define ECHO_PIN 11

// Structure to hold the parsed GNSS data
struct GNSSData {
  String runStatus;
  String fixType; // Field 3: 0=No fix, 1=2D fix, 2=3D fix
  String latitude;
  String latDir;
  String longitude;
  String lonDir;
  String date;
  String time;
  String altitude; // Field 11
};

// --- Function Prototypes ---
long getWaterLevelDistance();
String readResponse(AltSoftSerial &port, uint32_t timeout);
void flushResponse(AltSoftSerial &port, uint32_t timeout);
void parseAndPrintRefinedReport(String raw, long distance);


void setup() {
  Serial.begin(115200);
  altSerial.begin(9600); // Set to 115200 if module's default is 115200
  delay(1000);

  // Initialize Ultrasonic Sensor Pins
  pinMode(TRIGGER_PIN, OUTPUT);
  digitalWrite(TRIGGER_PIN, LOW);
  pinMode(ECHO_PIN, INPUT);

  Serial.println("--- System Initialized: SIM A7672S & HC-SR04 ---");
  flushResponse(altSerial, 1000);

  // Power on GNSS engine
  Serial.println("Powering GNSS (AT+CGNSSPWR=1)...");
  altSerial.print("AT+CGNSSPWR=1\r");

  // Wait long enough for the READY response and initial fix attempt
  Serial.println("Waiting 60s for initial fix. Antenna status is critical!");
  delay(60000); 
  flushResponse(altSerial, 1000); // Print module response (should show "OK" and "+CGNSSPWR: READY!")
}

void loop() {
  Serial.println("====================================");
  
  // 1. READ ULTRASONIC DISTANCE (Water Level)
  long waterLevelCm = getWaterLevelDistance();
  
  // 2. REQUEST GPS DATA
  altSerial.print("AT+CGNSSINFO\r");
  delay(1000);

  String response = readResponse(altSerial, 2000);

  if (response.length() > 0) {
    // 3. PARSE AND PRINT ALL DATA
    parseAndPrintRefinedReport(response, waterLevelCm);
  } else {
    Serial.println("Module did not respond to GPS request.");
  }

  // Poll every 5 seconds (4s delay + 1s read time)
  delay(4000);
}

// Function to read the distance from the HC-SR04, now labeled Water Level
long getWaterLevelDistance() {
  // Clear the trigger pin
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);

  // Send 10us pulse to trigger
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  // Read the echo time
  long duration = pulseIn(ECHO_PIN, HIGH);

  // Convert time duration to distance in cm
  // Speed of sound = 340 m/s or 29 microseconds per centimeter
  // Distance = (Duration * Speed of Sound) / 2
  long distance = duration / 58; 
  return distance;
}


// Reads module response from the provided serial port as a string
String readResponse(AltSoftSerial &port, uint32_t timeout) {
  String resp = "";
  uint32_t start = millis();
  while (millis() - start < timeout) {
    while (port.available()) {
      char c = port.read();
      resp += c;
    }
  }
  return resp;
}

// Flushes the serial buffer and prints any immediate response
void flushResponse(AltSoftSerial &port, uint32_t timeout) {
  String resp = readResponse(port, timeout);
  if (resp.length() > 0) {
    Serial.print("Module Startup Response: ");
    Serial.println(resp);
  }
}


// Parses +CGNSSINFO line and prints only the selected fields
void parseAndPrintRefinedReport(String raw, long waterLevelCm) {
  int startIdx = raw.indexOf("+CGNSSINFO:");
  if (startIdx == -1) {
    Serial.println("No +CGNSSINFO: line found in response.");
    return;
  }

  String dataLine = raw.substring(startIdx);
  int endLineIdx = dataLine.indexOf("\r");
  if (endLineIdx != -1) {
    dataLine = dataLine.substring(0, endLineIdx);
  }

  dataLine.replace("+CGNSSINFO: ", "");
  
  GNSSData data;
  
  int fieldStart = 0;
  int fieldEnd = 0;
  int fieldNum = 0;

  // Split CSV fields and map them to the correct struct fields
  while (fieldStart <= dataLine.length()) {
    fieldEnd = dataLine.indexOf(',', fieldStart);
    String field;
    
    if (fieldEnd == -1) {
      field = dataLine.substring(fieldStart);
      fieldStart = dataLine.length() + 1;
    } else {
      field = dataLine.substring(fieldStart, fieldEnd);
      fieldStart = fieldEnd + 1;
    }

    field.trim();

    // MAPPING ONLY THE REQUIRED FIELDS
    switch (fieldNum) {
      case 3: data.fixType = field; break;   // Field 3: Fix Type (0=No fix, 1=2D, 2=3D)
      case 5: data.latitude = field; break;
      case 6: data.latDir = field; break;
      case 7: data.longitude = field; break;
      case 8: data.lonDir = field; break;
      case 9: data.date = field; break;
      case 10: data.time = field; break;
      default: break;
    }
    fieldNum++;
  }

  // --- TIME ZONE CONVERSION AND FORMATTING ---
  String dateStr = data.date; // DDMMYY (e.g., 171025)
  String timeStr = data.time; // HHMMSS.SS (e.g., 181721.00)

  // Extract date components
  int day = dateStr.substring(0, 2).toInt();
  int month = dateStr.substring(2, 4).toInt();
  int year = 2000 + dateStr.substring(4, 6).toInt();

  // Extract time components
  int hour = timeStr.substring(0, 2).toInt();
  int minute = timeStr.substring(2, 4).toInt();
  String seconds = timeStr.substring(4, 9); // Keep seconds as string for precision (SS.SS)
  
  // --- IST Conversion (UTC + 5 hours 30 minutes) ---
  // 1. Add 30 minutes
  minute += 30;
  if (minute >= 60) {
    minute -= 60;
    hour += 1;
  }

  // 2. Add 5 hours
  hour += 5;
  
  String dateRolloverMsg = " UTC";
  if (hour >= 24) {
    hour -= 24;
    // Simplified day rollover handling (since full month/year logic is complex)
    day += 1; 
    dateRolloverMsg = " IST (Next Day)";
    
    // Check if the day rollover should trigger a month change (Warning only)
    if (day > 31 || (day == 31 && (month==4 || month==6 || month==9 || month==11)) || (month==2 && day > 29)) {
        dateRolloverMsg = " IST (WARN: Possible Month Rollover!)";
    } else {
        dateRolloverMsg = " IST";
    }
  } else {
    dateRolloverMsg = " IST";
  }

  // --- REFINED REPORT OUTPUT ---
  Serial.println("--- LOCATION & WATER LEVEL REPORT ---");
  
  Serial.print("Date & Time (IST): "); 
  
  // Print formatted date (DD/MM/YYYY)
  if (day < 10) Serial.print("0"); Serial.print(day); Serial.print("/");
  if (month < 10) Serial.print("0"); Serial.print(month); Serial.print("/");
  Serial.print(year); Serial.print(" ");

  // Print formatted time (HH:MM:SS)
  if (hour < 10) Serial.print("0"); Serial.print(hour); Serial.print(":");
  if (minute < 10) Serial.print("0"); Serial.print(minute); Serial.print(":");
  Serial.print(seconds.substring(0, 5)); // Use SS.SS format
  Serial.println(dateRolloverMsg);
  
  Serial.print("Fix Status: "); 
  if (data.fixType == "1") {
    Serial.println("2D Fix Available");
  } else if (data.fixType == "2") {
    Serial.println("3D Fix Available");
  } else {
    // Fix Type 0: Position is unreliable.
    Serial.println("NO RELIABLE GPS FIX");
  }

  Serial.print("Latitude Value: "); 
  if (data.fixType != "0" && data.latitude.length() > 0) {
    Serial.print(data.latitude); Serial.println(data.latDir);
  } else {
    Serial.println("N/A (No Reliable Fix)");
  }

  Serial.print("Longitude Value: "); 
  if (data.fixType != "0" && data.longitude.length() > 0) {
    Serial.print(data.longitude); Serial.println(data.lonDir);
  } else {
    Serial.println("N/A (No Reliable Fix)");
  }
  
  Serial.print("Water Level: ");
  Serial.print(waterLevelCm);
  Serial.println(" cm");
  Serial.println("====================================");
}
