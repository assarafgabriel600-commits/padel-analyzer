import SwiftUI

struct SubjectCardView: View {
    let subject: GeneratedSubject

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(subject.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if !subject.subjectLabel.isEmpty {
                        Text(subject.subjectLabel)
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.brevBlue.opacity(0.12))
                            .foregroundColor(.brevBlue)
                            .clipShape(Capsule())
                    }
                }

                Spacer()

                Image(systemName: "doc.fill")
                    .font(.title2)
                    .foregroundColor(.brevBlue.opacity(0.5))
            }

            if !subject.themesLabel.isEmpty {
                Text(subject.themesLabel)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            HStack {
                if let count = subject.exerciseCount {
                    Label("\(count) exercice\(count > 1 ? "s" : "")", systemImage: "list.bullet")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text(subject.formattedDate)
                    .font(.caption)
                    .foregroundColor(.tertiary)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.07), radius: 8, y: 3)
    }
}

// MARK: - Shared Components

struct BrevBackground: View {
    var body: some View {
        ZStack {
            Color(.systemGroupedBackground)
                .ignoresSafeArea()

            // Decorative background pattern
            VStack(spacing: 0) {
                LinearGradient(
                    colors: [Color.brevBlue.opacity(0.06), .clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 220)
                Spacer()
            }
            .ignoresSafeArea()
        }
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundColor(.brevBlue.opacity(0.4))

            Text(title)
                .font(.title3.bold())
                .foregroundColor(.secondary)

            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }
}

struct BrevTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String?
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType? = nil

    var body: some View {
        HStack(spacing: 10) {
            if let icon {
                Image(systemName: icon)
                    .foregroundColor(.secondary)
                    .frame(width: 18)
            }
            TextField(placeholder, text: $text)
                .keyboardType(keyboardType)
                .textContentType(textContentType)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct BrevSecureField: View {
    let placeholder: String
    @Binding var text: String
    @Binding var showPassword: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "lock")
                .foregroundColor(.secondary)
                .frame(width: 18)

            if showPassword {
                TextField(placeholder, text: $text)
                    .textContentType(.password)
            } else {
                SecureField(placeholder, text: $text)
                    .textContentType(.password)
            }

            Button { showPassword.toggle() } label: {
                Image(systemName: showPassword ? "eye.slash" : "eye")
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct BrevButton: View {
    let title: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(title)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
        }
        .background(Color.brevBlue)
        .foregroundColor(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .disabled(isLoading)
        .opacity(isLoading ? 0.8 : 1)
        .animation(.easeInOut(duration: 0.15), value: isLoading)
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
            Text(message)
                .font(.footnote)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.1))
        .foregroundColor(.red)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "book.pages.fill")
                    .font(.system(size: 72))
                    .foregroundColor(.brevBlue)
                Text("BrevApp")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
            }
        }
    }
}

// MARK: - Color palette

extension Color {
    static let brevBlue = Color(red: 0.0, green: 0.33, blue: 0.85)
    static let brevIndigo = Color(red: 0.24, green: 0.20, blue: 0.87)
    static let brevDark = Color(red: 0.08, green: 0.10, blue: 0.20)
}
