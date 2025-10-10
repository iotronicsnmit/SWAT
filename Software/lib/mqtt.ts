"use client"

import mqtt from 'mqtt'

export interface SensorData {
  waterLevel: number
  lat?: number
  lon?: number
  timestamp: number
}

export class MQTTClient {
  private client: mqtt.MqttClient | null = null
  private listeners: Set<(data: SensorData) => void> = new Set()

  connect(brokerUrl: string) {
    this.client = mqtt.connect(brokerUrl)

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker')
      this.client?.subscribe('tanker/data')
    })

    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString())
        this.notifyListeners(data)
      } catch (error) {
        console.error('Failed to parse MQTT message:', error)
      }
    })
  }

  subscribe(callback: (data: SensorData) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(data: SensorData) {
    this.listeners.forEach(callback => callback(data))
  }

  disconnect() {
    this.client?.end()
  }
}
