// Galaxy STT — macOS Speech. Apple dictation (sunucu) öncelikli: Türkçe on-device
// model fısıltıda ve günlük konuşmada zayıf kalıyor. Voice processing = AGC + echo.
// stdout JSON satırları: status / partial / final / error
// stdin: "quit" | "pause" | "resume" | "hints [<json string array>]"
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

func parseHints(_ raw: String) -> [String] {
    let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let data = t.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [String] else { return [] }
    var seen = Set<String>()
    var out: [String] = []
    for s in arr {
        let x = s.trimmingCharacters(in: .whitespacesAndNewlines)
        if x.count >= 2 && x.count <= 80 && seen.insert(x.lowercased()).inserted { out.append(x) }
        if out.count >= 100 { break }
    }
    return out
}

func sttLocaleId() -> String {
    let raw = (ProcessInfo.processInfo.environment["GALAXY_STT_LOCALE"] ?? "tr-TR")
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased()
    if raw.hasPrefix("en") { return "en-US" }
    return "tr-TR"
}

final class STT {
    let recognizer: SFSpeechRecognizer?
    let engine = AVAudioEngine()
    var request: SFSpeechAudioBufferRecognitionRequest?
    var task: SFSpeechRecognitionTask?
    var restarting = false
    var stopped = false
    var paused = false
    var hints: [String] = []
    var voiceProc = false

    init() {
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: sttLocaleId()))
        if let raw = ProcessInfo.processInfo.environment["GALAXY_STT_HINTS"] {
            hints = parseHints(raw)
        }
    }

    func start() {
        guard let recognizer = recognizer else { emit("error", "no-recognizer"); return }
        if stopped || paused { return }
        guard recognizer.isAvailable else { emit("error", "recognizer-unavailable"); return }
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.taskHint = .dictation
        if !hints.isEmpty { req.contextualStrings = hints }
        // Sunucu dictation Türkçe'de on-device'dan belirgin daha iyi; yoksa cihaza düş.
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = false
            emit("status", "server")
        } else {
            emit("status", "ondevice")
        }
        request = req

        let input = engine.inputNode
        if !voiceProc {
            do {
                try input.setVoiceProcessingEnabled(true)
                voiceProc = true
            } catch {
                voiceProc = false
            }
        }
        input.removeTap(onBus: 0)
        // format:nil = motorun gerçek formatı. Voice processing sonrası 0Hz tap = sağır STT.
        var tapFmt: AVAudioFormat? = input.outputFormat(forBus: 0)
        if tapFmt == nil || tapFmt!.sampleRate < 1 || tapFmt!.channelCount < 1 {
            tapFmt = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 1)
        }
        input.installTap(onBus: 0, bufferSize: 2048, format: tapFmt) { [weak self] buf, _ in
            self?.request?.append(buf)
        }
        engine.prepare()
        do { try engine.start() } catch {
            emit("error", "engine:\(error.localizedDescription)"); return
        }
        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                let alts = result.transcriptions.prefix(3).map { $0.formattedString }
                let text = alts.first ?? result.bestTranscription.formattedString
                if result.isFinal {
                    emit("final", text)
                    if alts.count > 1 { emit("alts", alts.dropFirst().joined(separator: "\t")) }
                    self.restart()
                } else {
                    emit("partial", text)
                }
            }
            if error != nil { self.restart() }
        }
        emit("status", "listening")
    }

    func restart() {
        if restarting || stopped || paused { return }
        restarting = true
        stopInternal()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            self.restarting = false
            if !self.stopped && !self.paused { self.start() }
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

    func stop() { stopped = true; paused = false; stopInternal(); emit("status", "stopped") }

    func pause() {
        if stopped { return }
        paused = true
        stopInternal()
        emit("status", "paused")
    }

    func resumeListen() {
        if stopped { return }
        paused = false
        if engine.isRunning { return }
        start()
    }
}

let stt = STT()

func requestMic(_ done: @escaping (Bool) -> Void) {
    if #available(macOS 10.14, *) {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: done(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                DispatchQueue.main.async { done(granted) }
            }
        default: done(false)
        }
    } else { done(true) }
}

SFSpeechRecognizer.requestAuthorization { status in
    DispatchQueue.main.async {
        switch status {
        case .authorized:
            requestMic { ok in
                if ok { emit("status", "authorized"); stt.start() }
                else { emit("error", "auth-denied") }
            }
        case .denied: emit("error", "auth-denied")
        case .restricted: emit("error", "auth-restricted")
        case .notDetermined: emit("error", "auth-notdetermined")
        @unknown default: emit("error", "auth-unknown")
        }
    }
}

DispatchQueue.global(qos: .background).async {
    while let line = readLine() {
        let t = line.trimmingCharacters(in: .whitespacesAndNewlines)
        if t == "quit" {
            DispatchQueue.main.async { stt.stop(); exit(0) }
        } else if t == "pause" {
            DispatchQueue.main.async { stt.pause() }
        } else if t == "resume" {
            DispatchQueue.main.async { stt.resumeListen() }
        } else if t.hasPrefix("hints ") {
            let payload = String(t.dropFirst(6))
            DispatchQueue.main.async {
                stt.hints = parseHints(payload)
                if !stt.paused { stt.restart() }
            }
        }
    }
}

RunLoop.main.run()
