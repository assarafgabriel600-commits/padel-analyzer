import Foundation

enum MessageRole: String, Codable {
    case user, assistant
}

struct ChatMessage: Identifiable, Codable, Equatable {
    let id: UUID
    let role: MessageRole
    var content: String
    var isStreaming: Bool

    init(id: UUID = .init(), role: MessageRole, content: String, isStreaming: Bool = false) {
        self.id = id
        self.role = role
        self.content = content
        self.isStreaming = isStreaming
    }
}

struct PDFReadyPayload: Codable {
    let subjectId: String
    let pdfUrl: String
    let title: String?

    enum CodingKeys: String, CodingKey {
        case subjectId = "subject_id"
        case pdfUrl = "pdf_url"
        case title
    }
}

enum SSEEvent {
    case token(String)
    case status(String)
    case pdfReady(PDFReadyPayload)
    case error(String)
    case done
}
