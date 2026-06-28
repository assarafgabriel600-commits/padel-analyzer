import SwiftUI

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isStreaming = false
    @Published var pendingPDF: PDFReadyPayload?
    @Published var errorMessage: String?

    private var sessionId: String? = UUID().uuidString

    init() {
        // Greeting from assistant
        messages.append(ChatMessage(
            role: .assistant,
            content: "👋 Salut ! Je suis ton assistant pour le Brevet. Dis-moi ce que tu veux réviser — une matière, un thème, un type d'exercice — et je te génère un sujet personnalisé à partir de vraies annales officielles. 📚\n\nPar exemple : *\"Je veux un développement construit sur la Guerre froide et une étude de documents sur les espaces de faible densité.\"*"
        ))
    }

    func send(text: String) async {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty, !isStreaming else { return }

        let userMsg = ChatMessage(role: .user, content: text)
        messages.append(userMsg)

        let assistantMsg = ChatMessage(role: .assistant, content: "", isStreaming: true)
        messages.append(assistantMsg)
        let assistantIdx = messages.count - 1

        isStreaming = true
        errorMessage = nil
        pendingPDF = nil

        // Build message history for API (exclude streaming placeholder)
        let history = messages.dropLast().map { msg -> [String: String] in
            ["role": msg.role.rawValue, "content": msg.content]
        }

        do {
            for try await event in APIService.shared.streamChat(messages: history, sessionId: sessionId) {
                switch event {
                case .token(let text):
                    messages[assistantIdx].content += text

                case .status(let msg):
                    // Status updates shown as subtle system note
                    if messages[assistantIdx].content.last != "\n" {
                        messages[assistantIdx].content += "\n"
                    }
                    messages[assistantIdx].content += "\n*\(msg)*"

                case .pdfReady(let payload):
                    pendingPDF = payload
                    messages[assistantIdx].isStreaming = false

                case .error(let msg):
                    errorMessage = msg
                    messages[assistantIdx].content += "\n\n⚠️ \(msg)"
                    messages[assistantIdx].isStreaming = false

                case .done:
                    messages[assistantIdx].isStreaming = false
                }
            }
        } catch {
            errorMessage = error.localizedDescription
            messages[assistantIdx].content += "\n\n⚠️ Connexion interrompue. Réessaie."
            messages[assistantIdx].isStreaming = false
        }

        isStreaming = false
    }

    func reset() {
        messages = []
        sessionId = UUID().uuidString
        pendingPDF = nil
        errorMessage = nil
        isStreaming = false
        messages.append(ChatMessage(
            role: .assistant,
            content: "👋 Nouvelle conversation ! Dis-moi ce que tu veux travailler pour le Brevet."
        ))
    }
}
