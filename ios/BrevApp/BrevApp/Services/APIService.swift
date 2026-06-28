import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case serverError(String)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "URL invalide."
        case .unauthorized: return "Session expirée. Reconnecte-toi."
        case .serverError(let msg): return msg
        case .decodingError(let e): return "Erreur de données : \(e.localizedDescription)"
        case .networkError(let e): return "Erreur réseau : \(e.localizedDescription)"
        }
    }
}

final class APIService {
    static let shared = APIService()

    // Change to your deployed API URL or localhost for dev
    private let baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:8000"

    private init() {}

    // MARK: - Generic JSON request

    func request<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = AuthService.shared.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: req)

        if let http = response as? HTTPURLResponse {
            if http.statusCode == 401 { throw APIError.unauthorized }
            if http.statusCode >= 400 {
                let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["detail"] ?? "Erreur serveur."
                throw APIError.serverError(msg)
            }
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func delete(_ path: String) async throws {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        if let token = AuthService.shared.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (_, response) = try await URLSession.shared.data(for: req)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            throw APIError.unauthorized
        }
    }

    // MARK: - SSE Streaming

    func streamChat(messages: [[String: String]], sessionId: String?) -> AsyncThrowingStream<SSEEvent, Error> {
        AsyncThrowingStream { continuation in
            Task {
                guard let url = URL(string: baseURL + "/chat/message") else {
                    continuation.finish(throwing: APIError.invalidURL)
                    return
                }

                var req = URLRequest(url: url)
                req.httpMethod = "POST"
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                if let token = AuthService.shared.accessToken {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }

                let payload: [String: Any] = [
                    "messages": messages,
                    "session_id": sessionId as Any,
                ]
                req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

                do {
                    let (stream, response) = try await URLSession.shared.bytes(for: req)
                    if let http = response as? HTTPURLResponse, http.statusCode == 401 {
                        continuation.finish(throwing: APIError.unauthorized)
                        return
                    }

                    var currentEvent: String = ""
                    var currentData: String = ""

                    for try await line in stream.lines {
                        if line.hasPrefix("event: ") {
                            currentEvent = String(line.dropFirst(7))
                        } else if line.hasPrefix("data: ") {
                            currentData = String(line.dropFirst(6))
                        } else if line.isEmpty {
                            // Dispatch event
                            if let event = parseSSEEvent(name: currentEvent, data: currentData) {
                                continuation.yield(event)
                                if case .done = event { continuation.finish(); return }
                            }
                            currentEvent = ""
                            currentData = ""
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: APIError.networkError(error))
                }
            }
        }
    }

    private func parseSSEEvent(name: String, data: String) -> SSEEvent? {
        guard let jsonData = data.data(using: .utf8) else { return nil }
        let json = (try? JSONSerialization.jsonObject(with: jsonData)) as? [String: Any]

        switch name {
        case "token":
            return .token(json?["text"] as? String ?? "")
        case "status":
            return .status(json?["message"] as? String ?? "")
        case "pdf_ready":
            if let payload = try? JSONDecoder().decode(PDFReadyPayload.self, from: jsonData) {
                return .pdfReady(payload)
            }
            return nil
        case "error":
            return .error(json?["message"] as? String ?? "Erreur inconnue.")
        case "done":
            return .done
        default:
            return nil
        }
    }
}
