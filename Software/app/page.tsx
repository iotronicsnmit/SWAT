import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WaterLevelGauge } from "@/components/water-level-gauge"
import { Map } from "@/components/map"
import { Activity, AlertCircle } from "lucide-react"

export default function Home() {
  const sampleData = {
    waterLevel: 75,
    tankCapacity: 5000,
    currentVolume: 3750,
    status: 'online',
    lastUpdate: new Date().toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">SWAT Dashboard</h1>
          <p className="text-gray-600 mt-2">Water Tanker Monitoring System</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WaterLevelGauge level={sampleData.waterLevel} capacity={sampleData.tankCapacity} />
          <Map />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Volume</CardTitle>
              <Activity className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sampleData.currentVolume}L</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 capitalize">{sampleData.status}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
