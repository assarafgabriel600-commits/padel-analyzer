import SwiftUI

struct MessageBubbleView: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == .user }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isUser { Spacer(minLength: 60) }

            if !isUser {
                // Assistant avatar
                ZStack {
                    Circle()
                        .fill(Color.brevBlue)
                        .frame(width: 30, height: 30)
                    Image(systemName: "graduationcap.fill")
                        .font(.system(size: 13))
                        .foregroundColor(.white)
                }
                .alignmentGuide(.bottom) { d in d[.bottom] }
            }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                bubbleContent
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isUser ? Color.brevBlue : Color(.systemBackground))
                    .foregroundColor(isUser ? .white : .primary)
                    .clipShape(BubbleShape(isUser: isUser))
                    .shadow(color: .black.opacity(0.07), radius: 4, y: 2)

                if message.isStreaming {
                    TypingIndicator()
                        .padding(.leading, 4)
                }
            }

            if !isUser { Spacer(minLength: 60) }
        }
    }

    @ViewBuilder
    private var bubbleContent: some View {
        if message.content.isEmpty && message.isStreaming {
            Text("…")
                .foregroundColor(.secondary)
        } else {
            // Render markdown-ish: bold (*text*) and italic (*text*)
            Text(parseMarkdown(message.content))
                .textSelection(.enabled)
        }
    }

    private func parseMarkdown(_ text: String) -> AttributedString {
        (try? AttributedString(markdown: text)) ?? AttributedString(text)
    }
}

private struct BubbleShape: Shape {
    let isUser: Bool

    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 18
        let tailSize: CGFloat = 6
        var path = Path()

        if isUser {
            path.addRoundedRect(in: CGRect(x: 0, y: 0, width: rect.width - tailSize, height: rect.height),
                                cornerSize: CGSize(width: radius, height: radius))
        } else {
            path.addRoundedRect(in: CGRect(x: tailSize, y: 0, width: rect.width - tailSize, height: rect.height),
                                cornerSize: CGSize(width: radius, height: radius))
        }
        return path
    }
}

struct TypingIndicator: View {
    @State private var animate = false

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 6, height: 6)
                    .scaleEffect(animate ? 1.0 : 0.5)
                    .animation(
                        .easeInOut(duration: 0.5).repeatForever().delay(Double(i) * 0.15),
                        value: animate
                    )
            }
        }
        .onAppear { animate = true }
    }
}
