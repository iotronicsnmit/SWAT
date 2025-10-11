import type { NextRequest } from "next/server"
import { getMqttSingleton } from "@/lib/mqtt-server"
import { getTamperDetector } from "@/lib/tamper-detection"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      
      const send = (data: any) => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (e) {
            console.error("[Stream] Send error:", e)
            closed = true
          }
        }
      }

      // initial ping to open the stream
      send({ type: "ready" })

      const mqtt = getMqttSingleton()
      const unsub = mqtt.subscribe((msg) => {
        send({ type: "mqtt", ...msg })
      })

      // Subscribe to tamper detection updates
      const tamperDetector = getTamperDetector()
      const tamperUnsub = tamperDetector.subscribe((status) => {
        send({ type: "tamper", ...status })
      })

      // send latest snapshot of all tankers
      const tankers = mqtt.getSnapshot()
      if (tankers && tankers.length > 0) {
        send({ type: "snapshot", tankers })
      }

      const ping = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`))
          } catch (e) {
            console.error("[Stream] Ping error:", e)
            closed = true
            clearInterval(ping)
          }
        }
      }, 25000)

      return () => {
        closed = true
        clearInterval(ping)
        unsub()
        tamperUnsub()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
