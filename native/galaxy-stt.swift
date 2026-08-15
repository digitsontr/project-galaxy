// Galaxy STT — macOS Speech framework ile native, cihaz-içi (offline) sürekli ses tanıma.
// Electron ana süreci bunu spawn eder; stdout'a satır satır JSON basar:
//   {"type":"status","text":"listening|authorized|stopped|ondevice|server"}
//   {"type":"partial","text":"..."}   {"type":"final","text":"..."}   {"type":"error","text":"..."}
// stdin'e "quit" gelince temiz kapanır. Türkçe (tr-TR); on-device varsa süre/limit yok.
import Foundation
import Speech
import AVFoundation

func emit(_ type: String, _ text: String) {
    let obj: [String: Any] = ["type": type, "text": text]
    if let d = try? JSONSerialization.data(withJSONObject: obj), var s = String(data: d, encoding: .utf8) {
        s += "\n"
        FileHandle.standardOutput.write(s.data(using: .utf8)!)
    }
}

final class STT {
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "tr-TR"))
    let engine = AVAudioEngine()
    var request: SFSpeechAudioBufferRecognitionRequest?
    var task: SFSpeechRecognitionTask?
    var restarting = false
    var stopped = false

    func start() {
        guard let recognizer = recognizer else { emit("error", "no-recognizer-tr"); return }
        guard recognizer.isAvailable else { emit("error", "recognizer-unavailable"); return }
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = true
            emit("status", "ondevice")
        } else {
            emit("status", "server")
        }
        request = req

        let input = engine.inputNode
        let fmt = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: fmt) { [weak self] buf, _ in
            self?.request?.append(buf)
        }
        engine.prepare()
        do { try engine.start() } catch {
            emit("error", "engine:\(error.localizedDescription)"); return
        }
        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                let text = result.bestTranscription.formattedString
                if result.isFinal { emit("final", text); self.restart() }
                else { emit("partial", text) }
            }
            if error != nil { self.restart() }
        }
        emit("status", "listening")
    }

    func restart() {
        if restarting || stopped { return }
        restarting = true
        stopInternal()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            self.restarting = false
            if !self.stopped { self.start() }
        }
    }

    func stopInternal() {
        engine.inputNode.removeTap(onBus: 0)
        if engine.isRunning { engine.stop() }
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
    }

    func stop() { stopped = true; stopInternal(); emit("status", "stopped") }
}

let stt = STT()

SFSpeechRecognizer.requestAuthorization { status in
    DispatchQueue.main.async {
        switch status {
        case .authorized: emit("status", "authorized"); stt.start()
        case .denied: emit("error", "auth-denied")
        case .restricted: emit("error", "auth-restricted")
        case .notDetermined: emit("error", "auth-notdetermined")
        @unknown default: emit("error", "auth-unknown")
        }
    }
}

// stdin: "quit" → çık
DispatchQueue.global(qos: .background).async {
    while let line = readLine() {
        if line.trimmingCharacters(in: .whitespacesAndNewlines) == "quit" {
            DispatchQueue.main.async { stt.stop(); exit(0) }
        }
    }
}

RunLoop.main.run()
