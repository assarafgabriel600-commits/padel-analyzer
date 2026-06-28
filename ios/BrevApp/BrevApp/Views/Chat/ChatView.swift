import SwiftUI

struct ChatView: View {
    @ObservedObject var chatVM: ChatViewModel
    let onPDFReady: (PDFReadyPayload) -> Void

    @State private var inputText = ""
    @FocusState private var inputFocused: Bool
    @State private var scrollProxy: ScrollViewProxy?

    var body: some View {
        ZStack(alignment: .bottom) {
            BrevBackground()

            VStack(spacing: 0) {
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(chatVM.messages) { msg in
                                MessageBubbleView(message: msg)
                                    .id(msg.id)
                            }

                            if let payload = chatVM.pendingPDF {
                                PDFReadyCard(payload: payload, onOpen: { onPDFReady(payload) })
                                    .id("pdf_card")
                                    .padding(.horizontal, 16)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)
                        .padding(.bottom, 100)
                    }
                    .onChange(of: chatVM.messages.count) { _ in
                        withAnimation { proxy.scrollTo(chatVM.messages.last?.id, anchor: .bottom) }
                    }
                    .onChange(of: chatVM.pendingPDF != nil) { _ in
                        withAnimation { proxy.scrollTo("pdf_card", anchor: .bottom) }
                    }
                }

                // Input bar
                ChatInputBar(text: $inputText, isStreaming: chatVM.isStreaming, isFocused: $inputFocused) {
                    let text = inputText.trimmingCharacters(in: .whitespaces)
                    inputText = ""
                    Task { await chatVM.send(text: text) }
                }
            }
        }
        .onTapGesture { inputFocused = false }
    }
}

// MARK: - Chat Input Bar

private struct ChatInputBar: View {
    @Binding var text: String
    let isStreaming: Bool
    var isFocused: FocusState<Bool>.Binding
    let onSend: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Décris ce que tu veux travailler...", text: $text, axis: .vertical)
                .lineLimit(1...5)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(.separator), lineWidth: 1))
                .focused(isFocused)
                .disabled(isStreaming)

            Button(action: onSend) {
                ZStack {
                    Circle()
                        .fill(canSend ? Color.brevBlue : Color(.systemGray4))
                        .frame(width: 40, height: 40)
                    if isStreaming {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.7)
                    } else {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .disabled(!canSend)
            .animation(.easeInOut(duration: 0.15), value: canSend)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Divider()
        }
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespaces).isEmpty && !isStreaming
    }
}

// MARK: - PDF Ready Card

private struct PDFReadyCard: View {
    let payload: PDFReadyPayload
    let onOpen: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title3)
                Text("Sujet généré avec succès !")
                    .font(.headline)
            }

            if let title = payload.title {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Button(action: onOpen) {
                Label("Ouvrir le PDF", systemImage: "doc.fill")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(.brevBlue)
        }
        .padding(16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 8, y: 3)
    }
}
