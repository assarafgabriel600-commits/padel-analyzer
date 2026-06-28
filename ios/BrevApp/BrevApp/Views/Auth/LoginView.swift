import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @FocusState private var focused: Field?

    enum Field { case email, password }

    var body: some View {
        VStack(spacing: 20) {
            if let err = authVM.errorMessage {
                ErrorBanner(message: err)
            }

            VStack(spacing: 14) {
                BrevTextField(
                    placeholder: "Email",
                    text: $email,
                    icon: "envelope",
                    keyboardType: .emailAddress,
                    textContentType: .emailAddress
                )
                .focused($focused, equals: .email)
                .submitLabel(.next)
                .onSubmit { focused = .password }

                BrevSecureField(
                    placeholder: "Mot de passe",
                    text: $password,
                    showPassword: $showPassword
                )
                .focused($focused, equals: .password)
                .submitLabel(.go)
                .onSubmit { Task { await login() } }
            }

            BrevButton(title: "Se connecter", isLoading: authVM.isLoading) {
                Task { await login() }
            }
            .disabled(email.isEmpty || password.isEmpty)
        }
        .padding(24)
    }

    private func login() async {
        focused = nil
        await authVM.login(email: email.lowercased().trimmingCharacters(in: .whitespaces), password: password)
    }
}
